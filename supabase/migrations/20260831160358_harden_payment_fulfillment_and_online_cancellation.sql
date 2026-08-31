-- M2.3 — Trusted Payment Transitions + Fulfillment Gate + Safe Online Cancellation Foundation

create table private.order_inventory_reservations (
  order_item_id uuid primary key references public.order_items(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  reserved_quantity integer not null,
  released_at timestamptz,
  release_reason text,
  created_at timestamptz not null default now(),
  constraint order_inventory_reservations_quantity_positive check (reserved_quantity > 0),
  constraint order_inventory_reservations_release_consistency check (
    ((released_at is null) and (release_reason is null))
    or ((released_at is not null) and (length(trim(coalesce(release_reason, ''))) >= 3))
  )
);

create index order_inventory_reservations_order_active_idx
on private.order_inventory_reservations(order_id)
where released_at is null;

revoke all on private.order_inventory_reservations from public, anon, authenticated, service_role;
grant select on private.order_inventory_reservations to service_role;

create or replace function private.create_order_with_payment_transaction(
  p_order jsonb,
  p_customer jsonb,
  p_items jsonb,
  p_idempotency_scope text,
  p_idempotency_key text,
  p_payment_method text,
  p_guest_access_token_hash text default null
)
returns table(order_id uuid, order_number text, payment_method text, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result record;
  v_payment private.payments%rowtype;
  v_order public.orders%rowtype;
  v_market public.markets%rowtype;
  v_method text := lower(trim(coalesce(p_payment_method, '')));
begin
  if v_method not in ('cod', 'online') then
    raise exception 'invalid_payment_method';
  end if;

  select * into v_result
  from public.create_order_transaction(
    p_order,
    p_customer,
    p_items,
    p_idempotency_scope,
    p_idempotency_key,
    p_guest_access_token_hash
  );

  if v_result.order_id is null then raise exception 'order_transaction_missing_result'; end if;

  select o.* into v_order
  from public.orders o
  where o.id = v_result.order_id
  for update;
  if not found then raise exception 'payment_order_missing'; end if;

  select p.* into v_payment
  from private.payments p
  where p.order_id = v_order.id
  for update;

  if found then
    if v_payment.method is null then
      if v_result.reused then raise exception 'payment_method_unknown_for_reused_order'; end if;
      update private.payments p
      set method = v_method, updated_at = now()
      where p.id = v_payment.id
      returning p.* into v_payment;
    elsif v_payment.method <> v_method then
      raise exception 'payment_method_mismatch';
    end if;
  else
    if v_result.reused then raise exception 'payment_record_missing_for_reused_order'; end if;
    select m.* into v_market from public.markets m where m.id = v_order.market_id;
    if not found or v_market.currency_minor_unit_scale is null then
      raise exception 'payment_currency_configuration_missing';
    end if;
    insert into private.payments (
      order_id, method, status, amount, currency_code,
      currency_minor_unit_scale, created_at, updated_at
    ) values (
      v_order.id, v_method, v_order.payment_status, v_order.final_total,
      v_order.currency_code, v_market.currency_minor_unit_scale,
      v_order.created_at, now()
    ) returning * into v_payment;
  end if;

  insert into private.payment_events (
    payment_id, event_type, event_source, source_key,
    amount, currency_code, metadata
  ) values (
    v_payment.id,
    'payment_initialized',
    'system',
    'payment-init:' || v_order.id::text,
    v_payment.amount,
    v_payment.currency_code,
    jsonb_build_object('method', v_method, 'order_payment_status', v_order.payment_status)
  ) on conflict (source_key) do nothing;

  if not coalesce(v_result.reused, false) then
    insert into private.order_inventory_reservations (
      order_item_id, order_id, product_id, reserved_quantity, created_at
    )
    select oi.id, oi.order_id, oi.product_id, oi.quantity, oi.created_at
    from public.order_items oi
    join public.products pr on pr.id = oi.product_id
    where oi.order_id = v_order.id
      and pr.made_to_order = false
    on conflict (order_item_id) do nothing;
  end if;

  return query
  select v_order.id, v_order.order_number, v_method, coalesce(v_result.reused, false);
end;
$$;

revoke all on function private.create_order_with_payment_transaction(jsonb,jsonb,jsonb,text,text,text,text)
from public, anon, authenticated, service_role;

create or replace function private.confirm_admin_order(p_order_id uuid)
returns table(order_id uuid, previous_status text, order_status text, changed boolean, changed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_current_status text;
  v_final_status text;
  v_payment_method text;
  v_payment_status text;
  v_changed boolean := false;
  v_changed_at timestamptz := now();
  v_was_confirmed boolean := false;
begin
  if v_user_id is null or not (select private.is_super_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_order_id is null then raise exception 'order_required'; end if;

  select o.status, p.method, p.status
  into v_current_status, v_payment_method, v_payment_status
  from public.orders o
  join private.payments p on p.order_id = o.id
  where o.id = p_order_id
  for update of o, p;

  if not found then raise exception 'order_or_payment_not_found'; end if;
  if v_payment_method is null then raise exception 'payment_method_unknown'; end if;
  if v_payment_status = 'cancelled' then raise exception 'payment_cancelled'; end if;
  if v_payment_method = 'online' and v_payment_status <> 'paid' then
    raise exception 'online_payment_required_before_confirmation';
  end if;
  if v_payment_method not in ('cod', 'online') then raise exception 'unsupported_payment_method'; end if;

  if v_current_status = 'received' then
    update public.orders
    set status = 'confirmed', updated_at = v_changed_at
    where id = p_order_id;
    insert into public.order_status_history(order_id, status, changed_by, source, created_at)
    values (p_order_id, 'confirmed', v_user_id, 'admin_confirmation', v_changed_at);
    v_changed := true;
  else
    select exists (
      select 1 from public.order_status_history h
      where h.order_id = p_order_id
        and h.status = 'confirmed'
        and h.source in ('admin_confirmation', 'online_payment_success')
    ) into v_was_confirmed;
    if not v_was_confirmed then raise exception 'invalid_order_confirmation_state'; end if;
  end if;

  perform private.ensure_order_ready_shipments(p_order_id, v_user_id, 'admin_confirmation');
  v_final_status := private.recompute_order_status(p_order_id, v_user_id, 'order_aggregation');

  return query
  select p_order_id, v_current_status, v_final_status, v_changed,
         case when v_changed then v_changed_at else null::timestamptz end;
end;
$$;

create or replace function private.update_my_artisan_fulfillment_status(
  p_artisan_group_id uuid,
  p_target_status text
)
returns table(
  artisan_group_id uuid,
  order_id uuid,
  previous_status text,
  fulfillment_status text,
  changed boolean,
  changed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_order_id uuid;
  v_artisan_id uuid;
  v_current_status text;
  v_order_status text;
  v_payment_method text;
  v_payment_status text;
  v_target_status text := lower(trim(coalesce(p_target_status, '')));
  v_changed_at timestamptz := now();
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if p_artisan_group_id is null then raise exception 'artisan_group_required'; end if;
  if v_target_status not in ('preparing', 'ready_for_courier_pickup') then
    raise exception 'invalid_fulfillment_target';
  end if;

  select g.order_id, g.artisan_id, g.fulfillment_status,
         o.status, p.method, p.status
  into v_order_id, v_artisan_id, v_current_status,
       v_order_status, v_payment_method, v_payment_status
  from public.order_artisan_groups g
  join public.artisan_profiles a
    on a.id = g.artisan_id and a.auth_user_id = v_user_id
  join public.orders o on o.id = g.order_id
  join private.payments p on p.order_id = o.id
  where g.id = p_artisan_group_id
  for update of g, o, p;

  if not found then raise exception 'artisan_group_not_found'; end if;
  if v_payment_method is null then raise exception 'payment_method_unknown'; end if;
  if v_payment_status = 'cancelled' or v_order_status in ('cancelled', 'returned') then
    raise exception 'order_not_fulfillable';
  end if;
  if v_payment_method = 'online' and v_payment_status <> 'paid' then
    raise exception 'online_payment_required_before_fulfillment';
  end if;
  if v_payment_method = 'cod' and v_order_status = 'received' then
    raise exception 'cod_order_requires_irth_confirmation';
  end if;
  if v_payment_method not in ('cod', 'online') then raise exception 'unsupported_payment_method'; end if;

  if v_current_status = v_target_status then
    return query
    select p_artisan_group_id, v_order_id, v_current_status, v_current_status, false, null::timestamptz;
    return;
  end if;
  if v_target_status = 'preparing' and v_current_status not in ('received', 'confirmed') then
    raise exception 'invalid_fulfillment_transition';
  end if;
  if v_target_status = 'ready_for_courier_pickup' and v_current_status <> 'preparing' then
    raise exception 'invalid_fulfillment_transition';
  end if;

  update public.order_artisan_groups
  set fulfillment_status = v_target_status, updated_at = v_changed_at
  where id = p_artisan_group_id;

  insert into public.order_artisan_group_status_history (
    artisan_group_id, order_id, artisan_id, from_status, to_status,
    changed_by_user_id, source, created_at
  ) values (
    p_artisan_group_id, v_order_id, v_artisan_id, v_current_status,
    v_target_status, v_user_id, 'artisan', v_changed_at
  );

  if v_target_status = 'ready_for_courier_pickup' then
    perform private.ensure_order_ready_shipments(v_order_id, v_user_id, 'artisan_ready');
  end if;
  perform private.recompute_order_status(v_order_id, v_user_id, 'artisan_aggregation');

  return query
  select p_artisan_group_id, v_order_id, v_current_status, v_target_status, true, v_changed_at;
end;
$$;

create or replace function private.record_online_payment_succeeded(
  p_order_id uuid,
  p_source_key text,
  p_provider_code text default null,
  p_provider_event_id text default null
)
returns table(order_id uuid, payment_status text, order_status text, changed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment private.payments%rowtype;
  v_order public.orders%rowtype;
  v_now timestamptz := now();
begin
  if p_order_id is null then raise exception 'order_required'; end if;
  if length(trim(coalesce(p_source_key, ''))) < 8 then raise exception 'payment_source_key_required'; end if;

  select o.* into v_order from public.orders o where o.id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  select p.* into v_payment from private.payments p where p.order_id = p_order_id for update;
  if not found then raise exception 'payment_not_found'; end if;

  if v_payment.method <> 'online' then raise exception 'online_payment_required'; end if;
  if v_payment.status = 'paid' then
    return query select v_order.id, v_payment.status, v_order.status, false;
    return;
  end if;
  if v_payment.status <> 'pending' or v_order.status <> 'received' then
    raise exception 'invalid_online_payment_success_state';
  end if;

  update private.payments
  set status = 'paid', paid_at = v_now, cancelled_at = null, updated_at = v_now
  where id = v_payment.id;
  update public.orders
  set payment_status = 'paid', status = 'confirmed', updated_at = v_now
  where id = v_order.id;

  insert into private.payment_events (
    payment_id, event_type, event_source, source_key,
    provider_code, provider_event_id, amount, currency_code, metadata
  ) values (
    v_payment.id, 'payment_succeeded', 'provider', trim(p_source_key),
    nullif(trim(coalesce(p_provider_code, '')), ''),
    nullif(trim(coalesce(p_provider_event_id, '')), ''),
    v_payment.amount, v_payment.currency_code,
    jsonb_build_object('method', 'online')
  );

  insert into public.order_status_history(order_id, status, changed_by, source, created_at)
  values (v_order.id, 'confirmed', null, 'online_payment_success', v_now);

  return query select v_order.id, 'paid'::text, 'confirmed'::text, true;
end;
$$;

revoke all on function private.record_online_payment_succeeded(uuid,text,text,text)
from public, anon, authenticated, service_role;

create or replace function public.record_online_payment_succeeded(
  p_order_id uuid,
  p_source_key text,
  p_provider_code text default null,
  p_provider_event_id text default null
)
returns table(order_id uuid, payment_status text, order_status text, changed boolean)
language sql
security invoker
set search_path = ''
as $$
  select * from private.record_online_payment_succeeded(
    p_order_id, p_source_key, p_provider_code, p_provider_event_id
  );
$$;

revoke all on function public.record_online_payment_succeeded(uuid,text,text,text)
from public, anon, authenticated;
grant execute on function public.record_online_payment_succeeded(uuid,text,text,text) to service_role;
grant execute on function private.record_online_payment_succeeded(uuid,text,text,text) to service_role;

create or replace function private.cancel_expired_online_order(
  p_order_id uuid,
  p_source_key text
)
returns table(order_id uuid, payment_status text, order_status text, restored_quantity integer, changed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment private.payments%rowtype;
  v_order public.orders%rowtype;
  v_now timestamptz := now();
  v_restored integer := 0;
begin
  if p_order_id is null then raise exception 'order_required'; end if;
  if length(trim(coalesce(p_source_key, ''))) < 8 then raise exception 'payment_source_key_required'; end if;

  select o.* into v_order from public.orders o where o.id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  select p.* into v_payment from private.payments p where p.order_id = p_order_id for update;
  if not found then raise exception 'payment_not_found'; end if;

  if v_payment.method <> 'online' then raise exception 'online_payment_required'; end if;
  if v_payment.status = 'cancelled' then
    return query select v_order.id, v_payment.status, v_order.status, 0, false;
    return;
  end if;
  if v_payment.status <> 'pending' or v_order.status <> 'received' then
    raise exception 'invalid_online_expiry_cancellation_state';
  end if;

  with active as (
    select r.product_id, sum(r.reserved_quantity)::integer as qty
    from private.order_inventory_reservations r
    where r.order_id = v_order.id and r.released_at is null
    group by r.product_id
  ), restored as (
    update public.products pr
    set quantity = pr.quantity + active.qty, updated_at = v_now
    from active
    where pr.id = active.product_id and pr.quantity is not null
    returning active.qty
  )
  select coalesce(sum(qty), 0)::integer into v_restored from restored;

  update private.order_inventory_reservations
  set released_at = v_now, release_reason = 'online_payment_expired'
  where order_id = v_order.id and released_at is null;

  update private.payments
  set status = 'cancelled', cancelled_at = v_now, paid_at = null, updated_at = v_now
  where id = v_payment.id;
  update public.orders
  set payment_status = 'cancelled', status = 'cancelled', updated_at = v_now
  where id = v_order.id;

  insert into private.payment_events (
    payment_id, event_type, event_source, source_key,
    amount, currency_code, metadata
  ) values (
    v_payment.id, 'payment_expired_order_cancelled', 'system', trim(p_source_key),
    v_payment.amount, v_payment.currency_code,
    jsonb_build_object('restored_quantity', v_restored)
  );

  insert into public.order_status_history(order_id, status, changed_by, source, created_at)
  values (v_order.id, 'cancelled', null, 'online_payment_expired', v_now);

  return query select v_order.id, 'cancelled'::text, 'cancelled'::text, v_restored, true;
end;
$$;

revoke all on function private.cancel_expired_online_order(uuid,text)
from public, anon, authenticated, service_role;

create or replace function public.cancel_expired_online_order(p_order_id uuid, p_source_key text)
returns table(order_id uuid, payment_status text, order_status text, restored_quantity integer, changed boolean)
language sql
security invoker
set search_path = ''
as $$
  select * from private.cancel_expired_online_order(p_order_id, p_source_key);
$$;

revoke all on function public.cancel_expired_online_order(uuid,text)
from public, anon, authenticated;
grant execute on function public.cancel_expired_online_order(uuid,text) to service_role;
grant execute on function private.cancel_expired_online_order(uuid,text) to service_role;

create or replace function private.record_admin_cod_collected(p_order_id uuid)
returns table(order_id uuid, payment_status text, changed boolean, changed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_payment private.payments%rowtype;
  v_order public.orders%rowtype;
  v_now timestamptz := now();
begin
  if v_user_id is null or not (select private.is_super_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select o.* into v_order from public.orders o where o.id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  select p.* into v_payment from private.payments p where p.order_id = p_order_id for update;
  if not found then raise exception 'payment_not_found'; end if;

  if v_payment.method <> 'cod' then raise exception 'cod_payment_required'; end if;
  if v_payment.status = 'paid' then
    return query select v_order.id, 'paid'::text, false, null::timestamptz;
    return;
  end if;
  if v_payment.status <> 'pending' then raise exception 'invalid_cod_payment_state'; end if;
  if v_order.status <> 'delivered' then raise exception 'cod_collection_requires_delivered_order'; end if;

  update private.payments
  set status = 'paid', paid_at = v_now, updated_at = v_now
  where id = v_payment.id;
  update public.orders
  set payment_status = 'paid', updated_at = v_now
  where id = v_order.id;

  insert into private.payment_events (
    payment_id, event_type, event_source, source_key,
    amount, currency_code, recorded_by_user_id, metadata
  ) values (
    v_payment.id, 'cod_collected', 'admin', 'cod-collected:' || v_order.id::text,
    v_payment.amount, v_payment.currency_code, v_user_id,
    jsonb_build_object('order_status', v_order.status)
  );

  return query select v_order.id, 'paid'::text, true, v_now;
end;
$$;

revoke all on function private.record_admin_cod_collected(uuid)
from public, anon, authenticated, service_role;

create or replace function public.record_admin_cod_collected(p_order_id uuid)
returns table(order_id uuid, payment_status text, changed boolean, changed_at timestamptz)
language sql
security invoker
set search_path = ''
as $$
  select * from private.record_admin_cod_collected(p_order_id);
$$;

revoke all on function public.record_admin_cod_collected(uuid) from public, anon;
grant execute on function public.record_admin_cod_collected(uuid) to authenticated;
grant execute on function private.record_admin_cod_collected(uuid) to authenticated;

-- M4.2 — Refund Money Logic Foundation
-- Approved 31 August 2026.
-- Provider-independent, append-only, server-authoritative.

alter table public.orders
  drop constraint if exists orders_payment_status_core_values;

alter table public.orders
  add constraint orders_payment_status_core_values
  check (payment_status in ('pending','paid','partially_refunded','refunded','cancelled'));

alter table private.payments
  drop constraint if exists payments_status_values,
  drop constraint if exists payments_paid_at_consistency,
  drop constraint if exists payments_cancelled_at_consistency;

alter table private.payments
  add constraint payments_status_values
    check (status in ('pending','paid','partially_refunded','refunded','cancelled')),
  add constraint payments_paid_at_consistency
    check ((status in ('paid','partially_refunded','refunded')) = (paid_at is not null)),
  add constraint payments_cancelled_at_consistency
    check ((status = 'cancelled') = (cancelled_at is not null));

alter table private.return_request_items
  add column inventory_restored_quantity integer not null default 0,
  add column inventory_restored_at timestamptz,
  add constraint return_request_items_inventory_restored_range
    check (
      inventory_restored_quantity >= 0
      and inventory_restored_quantity <= quantity
      and (restockable_quantity is null or inventory_restored_quantity <= restockable_quantity)
    ),
  add constraint return_request_items_inventory_restored_at_consistency
    check ((inventory_restored_quantity > 0) = (inventory_restored_at is not null));

create table private.refunds (
  id uuid primary key default gen_random_uuid(),
  return_request_id uuid not null unique references private.return_requests(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_id uuid not null references private.payments(id) on delete restrict,
  status text not null default 'pending',
  merchandise_amount numeric not null,
  shipping_amount numeric not null default 0,
  total_amount numeric not null,
  currency_code text not null,
  currency_minor_unit_scale smallint not null,
  prepared_by_user_id uuid references auth.users(id) on delete set null,
  prepared_at timestamptz not null default now(),
  succeeded_at timestamptz,
  provider_code text,
  provider_reference text,
  success_source_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint refunds_status_values check (status in ('pending','succeeded')),
  constraint refunds_amounts_non_negative check (merchandise_amount >= 0 and shipping_amount >= 0 and total_amount >= 0),
  constraint refunds_total_matches check (total_amount = merchandise_amount + shipping_amount),
  constraint refunds_currency_code_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint refunds_currency_scale_range check (currency_minor_unit_scale between 0 and 6),
  constraint refunds_amount_currency_scale check (
    merchandise_amount = round(merchandise_amount, currency_minor_unit_scale)
    and shipping_amount = round(shipping_amount, currency_minor_unit_scale)
    and total_amount = round(total_amount, currency_minor_unit_scale)
  ),
  constraint refunds_success_consistency check (
    (status = 'succeeded') = (succeeded_at is not null and success_source_key is not null)
  )
);

create unique index refunds_provider_reference_unique
  on private.refunds(provider_code, provider_reference)
  where provider_code is not null and provider_reference is not null;

create index refunds_order_status_idx on private.refunds(order_id, status);
create index refunds_payment_status_idx on private.refunds(payment_id, status);

create table private.refund_items (
  id uuid primary key default gen_random_uuid(),
  refund_id uuid not null references private.refunds(id) on delete restrict,
  return_request_item_id uuid not null unique references private.return_request_items(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  quantity integer not null,
  merchandise_refund_amount numeric not null,
  irth_subsidy_reversal_amount numeric not null,
  commission_reversal_amount numeric not null,
  artisan_entitlement_reversal_amount numeric not null,
  currency_code text not null,
  currency_minor_unit_scale smallint not null,
  created_at timestamptz not null default now(),
  constraint refund_items_quantity_positive check (quantity > 0),
  constraint refund_items_amounts_non_negative check (
    merchandise_refund_amount >= 0
    and irth_subsidy_reversal_amount >= 0
    and commission_reversal_amount >= 0
    and artisan_entitlement_reversal_amount >= 0
  ),
  constraint refund_items_entitlement_matches check (
    artisan_entitlement_reversal_amount = merchandise_refund_amount + irth_subsidy_reversal_amount - commission_reversal_amount
  ),
  constraint refund_items_currency_code_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint refund_items_currency_scale_range check (currency_minor_unit_scale between 0 and 6),
  constraint refund_items_amount_currency_scale check (
    merchandise_refund_amount = round(merchandise_refund_amount, currency_minor_unit_scale)
    and irth_subsidy_reversal_amount = round(irth_subsidy_reversal_amount, currency_minor_unit_scale)
    and commission_reversal_amount = round(commission_reversal_amount, currency_minor_unit_scale)
    and artisan_entitlement_reversal_amount = round(artisan_entitlement_reversal_amount, currency_minor_unit_scale)
  )
);

create index refund_items_refund_idx on private.refund_items(refund_id);
create index refund_items_order_item_idx on private.refund_items(order_item_id);

revoke all on private.refunds from public, anon, authenticated, service_role;
revoke all on private.refund_items from public, anon, authenticated, service_role;
grant select on private.refunds to service_role;
grant select on private.refund_items to service_role;

create or replace function private.prepare_return_refund(
  p_return_request_id uuid,
  p_shipping_refund_amount numeric default 0
)
returns table(refund_id uuid, return_request_id uuid, merchandise_amount numeric, shipping_amount numeric, total_amount numeric, changed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_return private.return_requests%rowtype;
  v_payment private.payments%rowtype;
  v_existing private.refunds%rowtype;
  v_scale smallint;
  v_currency text;
  v_refund_id uuid;
  v_shipping numeric;
  v_shipping_reserved numeric;
  v_merchandise_total numeric := 0;
  v_item record;
  v_order_qty integer;
  v_prior_qty integer;
  v_merch_total numeric;
  v_subsidy_total numeric;
  v_commission_total numeric;
  v_merch_amount numeric;
  v_subsidy_amount numeric;
  v_commission_amount numeric;
  v_entitlement_amount numeric;
begin
  if v_user_id is null or not (select private.is_super_admin()) then
    raise exception 'admin_required' using errcode='42501';
  end if;

  if p_return_request_id is null then raise exception 'return_request_required'; end if;

  select rr.* into v_return
  from private.return_requests rr
  where rr.id = p_return_request_id
  for update;
  if not found then raise exception 'return_request_not_found'; end if;

  select r.* into v_existing
  from private.refunds r
  where r.return_request_id = p_return_request_id;
  if found then
    return query select v_existing.id, v_existing.return_request_id, v_existing.merchandise_amount,
      v_existing.shipping_amount, v_existing.total_amount, false;
    return;
  end if;

  if v_return.status <> 'inspected' then raise exception 'return_must_be_inspected_before_refund'; end if;

  select p.* into v_payment
  from private.payments p
  where p.order_id = v_return.order_id
  for update;
  if not found then raise exception 'payment_not_found'; end if;
  if v_payment.status not in ('paid','partially_refunded') then
    raise exception 'payment_must_be_collected_before_refund';
  end if;

  select o.currency_code, m.currency_minor_unit_scale
  into v_currency, v_scale
  from public.orders o
  join public.markets m on m.id = o.market_id
  where o.id = v_return.order_id;
  if not found or v_scale is null then raise exception 'refund_currency_configuration_missing'; end if;

  v_shipping := round(coalesce(p_shipping_refund_amount,0), v_scale);
  if v_shipping < 0 then raise exception 'invalid_shipping_refund_amount'; end if;

  select coalesce(sum(r.shipping_amount),0)
  into v_shipping_reserved
  from private.refunds r
  where r.order_id = v_return.order_id
    and r.status in ('pending','succeeded');

  if v_shipping_reserved + v_shipping > (select o.shipping_fee from public.orders o where o.id=v_return.order_id) then
    raise exception 'shipping_refund_exceeds_order_shipping';
  end if;

  insert into private.refunds(
    return_request_id, order_id, payment_id, status,
    merchandise_amount, shipping_amount, total_amount,
    currency_code, currency_minor_unit_scale, prepared_by_user_id
  ) values (
    p_return_request_id, v_return.order_id, v_payment.id, 'pending',
    0, v_shipping, v_shipping,
    v_currency, v_scale, v_user_id
  ) returning id into v_refund_id;

  for v_item in
    select ri.id as return_item_id, ri.order_item_id, ri.quantity
    from private.return_request_items ri
    where ri.return_request_id = p_return_request_id
    order by ri.id
  loop
    select oi.quantity into v_order_qty
    from public.order_items oi
    where oi.id = v_item.order_item_id;
    if not found or v_order_qty <= 0 then raise exception 'refund_order_item_snapshot_missing'; end if;

    select coalesce(sum(fi.quantity),0)::integer
    into v_prior_qty
    from private.refund_items fi
    join private.refunds fr on fr.id = fi.refund_id
    where fi.order_item_id = v_item.order_item_id
      and fr.status in ('pending','succeeded');

    if v_prior_qty + v_item.quantity > v_order_qty then
      raise exception 'refund_quantity_exceeds_order_item';
    end if;

    select
      max(case when l.entry_type='merchandise_proceeds' then l.amount end),
      max(case when l.entry_type='irth_discount_subsidy' then l.amount end),
      max(case when l.entry_type='commission' then -l.amount end)
    into v_merch_total, v_subsidy_total, v_commission_total
    from private.artisan_settlement_ledger l
    where l.order_item_id = v_item.order_item_id
      and l.source='order_item_sale';

    if v_merch_total is null or v_subsidy_total is null or v_commission_total is null then
      raise exception 'refund_sale_ledger_snapshot_missing';
    end if;

    v_merch_amount := round(v_merch_total * (v_prior_qty + v_item.quantity) / v_order_qty, v_scale)
                    - round(v_merch_total * v_prior_qty / v_order_qty, v_scale);
    v_subsidy_amount := round(v_subsidy_total * (v_prior_qty + v_item.quantity) / v_order_qty, v_scale)
                      - round(v_subsidy_total * v_prior_qty / v_order_qty, v_scale);
    v_commission_amount := round(v_commission_total * (v_prior_qty + v_item.quantity) / v_order_qty, v_scale)
                         - round(v_commission_total * v_prior_qty / v_order_qty, v_scale);
    v_entitlement_amount := round(v_merch_amount + v_subsidy_amount - v_commission_amount, v_scale);

    if v_entitlement_amount < 0 then raise exception 'refund_entitlement_reversal_invalid'; end if;

    insert into private.refund_items(
      refund_id, return_request_item_id, order_item_id, quantity,
      merchandise_refund_amount, irth_subsidy_reversal_amount,
      commission_reversal_amount, artisan_entitlement_reversal_amount,
      currency_code, currency_minor_unit_scale
    ) values (
      v_refund_id, v_item.return_item_id, v_item.order_item_id, v_item.quantity,
      v_merch_amount, v_subsidy_amount, v_commission_amount, v_entitlement_amount,
      v_currency, v_scale
    );

    v_merchandise_total := v_merchandise_total + v_merch_amount;
  end loop;

  v_merchandise_total := round(v_merchandise_total, v_scale);

  update private.refunds r
  set merchandise_amount = v_merchandise_total,
      total_amount = round(v_merchandise_total + v_shipping, v_scale),
      updated_at = now()
  where r.id = v_refund_id;

  update private.return_requests rr
  set status='refund_pending', updated_at=now()
  where rr.id = p_return_request_id;

  insert into private.return_request_events(return_request_id,event_type,event_source,source_key,actor_user_id,metadata)
  values(
    p_return_request_id,
    'refund_prepared',
    'admin',
    'refund-prepared:'||v_refund_id::text,
    v_user_id,
    jsonb_build_object('refund_id',v_refund_id,'shipping_refund_amount',v_shipping)
  );

  insert into private.payment_events(payment_id,event_type,event_source,source_key,amount,currency_code,metadata,recorded_by_user_id)
  values(
    v_payment.id,
    'refund_prepared',
    'admin',
    'refund-prepared:'||v_refund_id::text,
    round(v_merchandise_total + v_shipping, v_scale),
    v_currency,
    jsonb_build_object('refund_id',v_refund_id,'return_request_id',p_return_request_id),
    v_user_id
  );

  return query select v_refund_id, p_return_request_id, v_merchandise_total, v_shipping,
    round(v_merchandise_total + v_shipping, v_scale), true;
end;
$$;

revoke all on function private.prepare_return_refund(uuid,numeric) from public, anon, authenticated, service_role;

create or replace function public.prepare_return_refund(
  p_return_request_id uuid,
  p_shipping_refund_amount numeric default 0
)
returns table(refund_id uuid, return_request_id uuid, merchandise_amount numeric, shipping_amount numeric, total_amount numeric, changed boolean)
language sql
security definer
set search_path = ''
as $$
  select * from private.prepare_return_refund(p_return_request_id,p_shipping_refund_amount);
$$;
revoke all on function public.prepare_return_refund(uuid,numeric) from public, anon, authenticated, service_role;
grant execute on function public.prepare_return_refund(uuid,numeric) to authenticated;

create or replace function private.record_return_refund_succeeded(
  p_refund_id uuid,
  p_source_key text,
  p_provider_code text default null,
  p_provider_reference text default null
)
returns table(refund_id uuid, refund_status text, payment_status text, changed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_refund private.refunds%rowtype;
  v_payment private.payments%rowtype;
  v_now timestamptz := now();
  v_prior_success numeric;
  v_success_total numeric;
  v_payment_status text;
  v_item record;
  v_product_id uuid;
  v_product_qty integer;
  v_made_to_order boolean;
  v_restore_qty integer;
begin
  if p_refund_id is null then raise exception 'refund_required'; end if;
  if p_source_key is null or length(trim(p_source_key)) < 8 then raise exception 'invalid_refund_source_key'; end if;

  select r.* into v_refund from private.refunds r where r.id=p_refund_id for update;
  if not found then raise exception 'refund_not_found'; end if;

  select p.* into v_payment from private.payments p where p.id=v_refund.payment_id for update;
  if not found then raise exception 'payment_not_found'; end if;

  if v_refund.status='succeeded' then
    return query select v_refund.id, v_refund.status, v_payment.status, false;
    return;
  end if;
  if v_refund.status<>'pending' then raise exception 'invalid_refund_state'; end if;
  if v_payment.status not in ('paid','partially_refunded') then raise exception 'payment_not_refundable'; end if;

  select coalesce(sum(r.total_amount),0)
  into v_prior_success
  from private.refunds r
  where r.payment_id=v_payment.id and r.status='succeeded';

  v_success_total := round(v_prior_success + v_refund.total_amount, v_refund.currency_minor_unit_scale);
  if v_success_total > v_payment.amount then raise exception 'refund_exceeds_payment_amount'; end if;

  for v_item in
    select fi.*, ri.restockable_quantity, ri.inventory_restored_quantity
    from private.refund_items fi
    join private.return_request_items ri on ri.id=fi.return_request_item_id
    where fi.refund_id=v_refund.id
    order by fi.id
  loop
    insert into private.artisan_settlement_ledger(
      entry_key,order_id,order_item_id,artisan_group_id,artisan_id,
      currency_code,currency_minor_unit_scale,entry_type,amount,
      calculation_base_amount,rate_percent,source,reason,reference_code,effective_at
    )
    select
      'refund:'||v_refund.id::text||':'||oi.id::text||':merchandise',
      oi.order_id,oi.id,oi.artisan_group_id,oi.artisan_id,
      v_refund.currency_code,v_refund.currency_minor_unit_scale,
      'refund_merchandise_reversal',-v_item.merchandise_refund_amount,
      null,null,'return_refund','approved_return_refund',v_refund.id::text,v_now
    from public.order_items oi where oi.id=v_item.order_item_id;

    insert into private.artisan_settlement_ledger(
      entry_key,order_id,order_item_id,artisan_group_id,artisan_id,
      currency_code,currency_minor_unit_scale,entry_type,amount,
      calculation_base_amount,rate_percent,source,reason,reference_code,effective_at
    )
    select
      'refund:'||v_refund.id::text||':'||oi.id::text||':irth_subsidy',
      oi.order_id,oi.id,oi.artisan_group_id,oi.artisan_id,
      v_refund.currency_code,v_refund.currency_minor_unit_scale,
      'refund_irth_subsidy_reversal',-v_item.irth_subsidy_reversal_amount,
      null,null,'return_refund','approved_return_refund',v_refund.id::text,v_now
    from public.order_items oi where oi.id=v_item.order_item_id;

    insert into private.artisan_settlement_ledger(
      entry_key,order_id,order_item_id,artisan_group_id,artisan_id,
      currency_code,currency_minor_unit_scale,entry_type,amount,
      calculation_base_amount,rate_percent,source,reason,reference_code,effective_at
    )
    select
      'refund:'||v_refund.id::text||':'||oi.id::text||':commission',
      oi.order_id,oi.id,oi.artisan_group_id,oi.artisan_id,
      v_refund.currency_code,v_refund.currency_minor_unit_scale,
      'refund_commission_reversal',v_item.commission_reversal_amount,
      v_item.merchandise_refund_amount + v_item.irth_subsidy_reversal_amount,
      oi.commission_rate_percent,'return_refund','approved_return_refund',v_refund.id::text,v_now
    from public.order_items oi where oi.id=v_item.order_item_id;

    v_restore_qty := greatest(coalesce(v_item.restockable_quantity,0) - coalesce(v_item.inventory_restored_quantity,0),0);
    if v_restore_qty > 0 then
      select oi.product_id into v_product_id from public.order_items oi where oi.id=v_item.order_item_id;
      if v_product_id is not null then
        select p.quantity,p.made_to_order into v_product_qty,v_made_to_order
        from public.products p where p.id=v_product_id for update;
        if found and v_product_qty is not null and not v_made_to_order then
          update public.products set quantity=quantity+v_restore_qty,updated_at=v_now where id=v_product_id;
          update private.return_request_items
          set inventory_restored_quantity=inventory_restored_quantity+v_restore_qty,
              inventory_restored_at=v_now,
              updated_at=v_now
          where id=v_item.return_request_item_id;
        end if;
      end if;
    end if;
  end loop;

  update private.refunds
  set status='succeeded',succeeded_at=v_now,
      provider_code=nullif(trim(p_provider_code),''),
      provider_reference=nullif(trim(p_provider_reference),''),
      success_source_key=trim(p_source_key),updated_at=v_now
  where id=v_refund.id;

  update private.return_requests
  set status='refunded',updated_at=v_now
  where id=v_refund.return_request_id;

  if v_success_total = v_payment.amount then v_payment_status:='refunded';
  else v_payment_status:='partially_refunded'; end if;

  update private.payments set status=v_payment_status,updated_at=v_now where id=v_payment.id;
  update public.orders set payment_status=v_payment_status,updated_at=v_now where id=v_refund.order_id;

  insert into private.payment_events(
    payment_id,event_type,event_source,source_key,provider_code,provider_event_id,
    amount,currency_code,metadata
  ) values (
    v_payment.id,
    'refund_succeeded',
    case when nullif(trim(p_provider_code),'') is null then 'system' else 'provider' end,
    trim(p_source_key),
    nullif(trim(p_provider_code),''),
    null,
    v_refund.total_amount,
    v_refund.currency_code,
    jsonb_build_object('refund_id',v_refund.id,'return_request_id',v_refund.return_request_id,'provider_reference',nullif(trim(p_provider_reference),''))
  );

  insert into private.return_request_events(return_request_id,event_type,event_source,source_key,metadata)
  values(
    v_refund.return_request_id,
    'refund_succeeded',
    'system',
    'return-refund-succeeded:'||v_refund.id::text,
    jsonb_build_object('refund_id',v_refund.id,'amount',v_refund.total_amount)
  );

  return query select v_refund.id,'succeeded',v_payment_status,true;
end;
$$;

revoke all on function private.record_return_refund_succeeded(uuid,text,text,text) from public, anon, authenticated, service_role;
grant execute on function private.record_return_refund_succeeded(uuid,text,text,text) to service_role;

create or replace function public.record_return_refund_succeeded(
  p_refund_id uuid,
  p_source_key text,
  p_provider_code text default null,
  p_provider_reference text default null
)
returns table(refund_id uuid, refund_status text, payment_status text, changed boolean)
language sql
security definer
set search_path = ''
as $$
  select * from private.record_return_refund_succeeded(p_refund_id,p_source_key,p_provider_code,p_provider_reference);
$$;
revoke all on function public.record_return_refund_succeeded(uuid,text,text,text) from public, anon, authenticated, service_role;
grant execute on function public.record_return_refund_succeeded(uuid,text,text,text) to service_role;

create table if not exists public.shipment_status_history (
  id bigint generated always as identity primary key,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  artisan_group_id uuid not null references public.order_artisan_groups(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by_user_id uuid references auth.users(id) on delete set null,
  source text not null default 'system',
  created_at timestamptz not null default now()
);

alter table public.shipment_status_history enable row level security;
revoke all on table public.shipment_status_history from public, anon, authenticated;

create index if not exists shipment_status_history_shipment_created_idx
  on public.shipment_status_history(shipment_id, created_at desc);
create index if not exists shipment_status_history_order_created_idx
  on public.shipment_status_history(order_id, created_at desc);

alter table public.shipments
  add constraint shipments_artisan_group_unique unique (artisan_group_id);

alter table public.shipments
  add constraint shipments_status_allowed
  check (status in ('pending','picked_up_from_artisan','in_transit','delivered','delivery_failed','returned'));

create or replace function private.ensure_order_ready_shipments(
  p_order_id uuid,
  p_changed_by_user_id uuid,
  p_source text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  with inserted as (
    insert into public.shipments(order_id, artisan_group_id, status)
    select g.order_id, g.id, 'pending'
    from public.order_artisan_groups g
    where g.order_id = p_order_id
      and g.fulfillment_status = 'ready_for_courier_pickup'
    on conflict (artisan_group_id) do nothing
    returning id, order_id, artisan_group_id
  )
  insert into public.shipment_status_history(
    shipment_id,
    order_id,
    artisan_group_id,
    from_status,
    to_status,
    changed_by_user_id,
    source
  )
  select
    i.id,
    i.order_id,
    i.artisan_group_id,
    null,
    'pending',
    p_changed_by_user_id,
    coalesce(nullif(trim(p_source), ''), 'system')
  from inserted i;
end;
$$;

revoke all on function private.ensure_order_ready_shipments(uuid,uuid,text) from public, anon, authenticated;

create or replace function private.recompute_order_status(
  p_order_id uuid,
  p_changed_by_user_id uuid,
  p_source text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_status text;
  v_target_status text;
  v_group_count integer;
  v_all_groups_ready boolean;
  v_all_groups_preparing_or_ready boolean;
  v_shipment_count integer;
  v_any_delivery_failed boolean;
  v_all_shipments_delivered boolean;
  v_all_shipments_in_transit_or_delivered boolean;
  v_all_shipments_picked_up_or_later boolean;
begin
  select o.status
  into v_current_status
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_current_status in ('received','cancelled','returned') then
    return v_current_status;
  end if;

  select
    count(*)::int,
    coalesce(bool_and(g.fulfillment_status = 'ready_for_courier_pickup'), false),
    coalesce(bool_and(g.fulfillment_status in ('preparing','ready_for_courier_pickup')), false)
  into v_group_count, v_all_groups_ready, v_all_groups_preparing_or_ready
  from public.order_artisan_groups g
  where g.order_id = p_order_id;

  select
    count(*)::int,
    coalesce(bool_or(s.status = 'delivery_failed'), false),
    coalesce(bool_and(s.status = 'delivered'), false),
    coalesce(bool_and(s.status in ('in_transit','delivered')), false),
    coalesce(bool_and(s.status in ('picked_up_from_artisan','in_transit','delivered')), false)
  into
    v_shipment_count,
    v_any_delivery_failed,
    v_all_shipments_delivered,
    v_all_shipments_in_transit_or_delivered,
    v_all_shipments_picked_up_or_later
  from public.shipments s
  where s.order_id = p_order_id;

  v_target_status := case
    when v_any_delivery_failed then 'delivery_failed'
    when v_shipment_count > 0 and v_all_shipments_delivered then 'delivered'
    when v_shipment_count > 0 and v_all_shipments_in_transit_or_delivered then 'in_transit'
    when v_shipment_count > 0 and v_all_shipments_picked_up_or_later then 'picked_up_from_artisan'
    when v_group_count > 0 and v_all_groups_ready then 'ready_for_courier_pickup'
    when v_group_count > 0 and v_all_groups_preparing_or_ready then 'preparing'
    else 'confirmed'
  end;

  if v_target_status <> v_current_status then
    update public.orders
    set status = v_target_status,
        updated_at = now()
    where id = p_order_id;

    insert into public.order_status_history(order_id, status, changed_by, source)
    values (
      p_order_id,
      v_target_status,
      p_changed_by_user_id,
      coalesce(nullif(trim(p_source), ''), 'aggregation')
    );
  end if;

  return v_target_status;
end;
$$;

revoke all on function private.recompute_order_status(uuid,uuid,text) from public, anon, authenticated;

create or replace function private.confirm_admin_order(p_order_id uuid)
returns table(
  order_id uuid,
  previous_status text,
  order_status text,
  changed boolean,
  changed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_current_status text;
  v_final_status text;
  v_changed boolean := false;
  v_changed_at timestamptz := now();
begin
  if v_user_id is null or not (select private.is_super_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if p_order_id is null then
    raise exception 'order_required';
  end if;

  select o.status
  into v_current_status
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_current_status = 'received' then
    update public.orders
    set status = 'confirmed',
        updated_at = v_changed_at
    where id = p_order_id;

    insert into public.order_status_history(order_id, status, changed_by, source, created_at)
    values (p_order_id, 'confirmed', v_user_id, 'admin_confirmation', v_changed_at);

    v_changed := true;
  elsif v_current_status <> 'confirmed' then
    raise exception 'invalid_order_confirmation_state';
  end if;

  perform private.ensure_order_ready_shipments(p_order_id, v_user_id, 'admin_confirmation');
  v_final_status := private.recompute_order_status(p_order_id, v_user_id, 'order_aggregation');

  return query
  select p_order_id, v_current_status, v_final_status, v_changed, case when v_changed then v_changed_at else null::timestamptz end;
end;
$$;

create or replace function public.confirm_admin_order(p_order_id uuid)
returns table(
  order_id uuid,
  previous_status text,
  order_status text,
  changed boolean,
  changed_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.confirm_admin_order(p_order_id);
$$;

revoke all on function private.confirm_admin_order(uuid) from public, anon;
grant execute on function private.confirm_admin_order(uuid) to authenticated;
revoke all on function public.confirm_admin_order(uuid) from public, anon;
grant execute on function public.confirm_admin_order(uuid) to authenticated;

create or replace function private.update_admin_shipment_status(
  p_shipment_id uuid,
  p_target_status text
)
returns table(
  shipment_id uuid,
  order_id uuid,
  artisan_group_id uuid,
  previous_status text,
  shipment_status text,
  order_status text,
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
  v_artisan_group_id uuid;
  v_current_status text;
  v_target_status text := lower(trim(coalesce(p_target_status, '')));
  v_order_status text;
  v_changed_at timestamptz := now();
begin
  if v_user_id is null or not (select private.is_super_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if p_shipment_id is null then
    raise exception 'shipment_required';
  end if;

  if v_target_status not in ('picked_up_from_artisan','in_transit','delivered','delivery_failed') then
    raise exception 'invalid_shipment_target';
  end if;

  select s.order_id, s.artisan_group_id, s.status
  into v_order_id, v_artisan_group_id, v_current_status
  from public.shipments s
  where s.id = p_shipment_id
  for update;

  if not found then
    raise exception 'shipment_not_found';
  end if;

  if v_current_status = v_target_status then
    select o.status into v_order_status from public.orders o where o.id = v_order_id;
    return query
    select p_shipment_id, v_order_id, v_artisan_group_id, v_current_status, v_current_status, v_order_status, false, null::timestamptz;
    return;
  end if;

  if v_target_status = 'picked_up_from_artisan' and v_current_status <> 'pending' then
    raise exception 'invalid_shipment_transition';
  elsif v_target_status = 'in_transit' and v_current_status <> 'picked_up_from_artisan' then
    raise exception 'invalid_shipment_transition';
  elsif v_target_status = 'delivered' and v_current_status <> 'in_transit' then
    raise exception 'invalid_shipment_transition';
  elsif v_target_status = 'delivery_failed' and v_current_status not in ('picked_up_from_artisan','in_transit') then
    raise exception 'invalid_shipment_transition';
  end if;

  update public.shipments
  set status = v_target_status,
      delivered_at = case when v_target_status = 'delivered' then v_changed_at else delivered_at end,
      updated_at = v_changed_at
  where id = p_shipment_id;

  insert into public.shipment_status_history(
    shipment_id,
    order_id,
    artisan_group_id,
    from_status,
    to_status,
    changed_by_user_id,
    source,
    created_at
  ) values (
    p_shipment_id,
    v_order_id,
    v_artisan_group_id,
    v_current_status,
    v_target_status,
    v_user_id,
    'admin_manual',
    v_changed_at
  );

  v_order_status := private.recompute_order_status(v_order_id, v_user_id, 'shipment_aggregation');

  return query
  select p_shipment_id, v_order_id, v_artisan_group_id, v_current_status, v_target_status, v_order_status, true, v_changed_at;
end;
$$;

create or replace function public.update_admin_shipment_status(
  p_shipment_id uuid,
  p_target_status text
)
returns table(
  shipment_id uuid,
  order_id uuid,
  artisan_group_id uuid,
  previous_status text,
  shipment_status text,
  order_status text,
  changed boolean,
  changed_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.update_admin_shipment_status(p_shipment_id, p_target_status);
$$;

revoke all on function private.update_admin_shipment_status(uuid,text) from public, anon;
grant execute on function private.update_admin_shipment_status(uuid,text) to authenticated;
revoke all on function public.update_admin_shipment_status(uuid,text) from public, anon;
grant execute on function public.update_admin_shipment_status(uuid,text) to authenticated;

create or replace function private.update_my_artisan_fulfillment_status(p_artisan_group_id uuid, p_target_status text)
returns table(artisan_group_id uuid, order_id uuid, previous_status text, fulfillment_status text, changed boolean, changed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_order_id uuid;
  v_artisan_id uuid;
  v_current_status text;
  v_target_status text := lower(trim(coalesce(p_target_status, '')));
  v_changed_at timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_artisan_group_id is null then
    raise exception 'artisan_group_required';
  end if;

  if v_target_status not in ('preparing', 'ready_for_courier_pickup') then
    raise exception 'invalid_fulfillment_target';
  end if;

  select g.order_id, g.artisan_id, g.fulfillment_status
  into v_order_id, v_artisan_id, v_current_status
  from public.order_artisan_groups g
  join public.artisan_profiles a
    on a.id = g.artisan_id
   and a.auth_user_id = v_user_id
  where g.id = p_artisan_group_id
  for update of g;

  if not found then
    raise exception 'artisan_group_not_found';
  end if;

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
  set fulfillment_status = v_target_status,
      updated_at = v_changed_at
  where id = p_artisan_group_id;

  insert into public.order_artisan_group_status_history (
    artisan_group_id,
    order_id,
    artisan_id,
    from_status,
    to_status,
    changed_by_user_id,
    source,
    created_at
  ) values (
    p_artisan_group_id,
    v_order_id,
    v_artisan_id,
    v_current_status,
    v_target_status,
    v_user_id,
    'artisan',
    v_changed_at
  );

  if v_target_status = 'ready_for_courier_pickup' then
    perform private.ensure_order_ready_shipments(v_order_id, v_user_id, 'artisan_ready');
  end if;

  perform private.recompute_order_status(v_order_id, v_user_id, 'artisan_aggregation');

  return query
  select p_artisan_group_id, v_order_id, v_current_status, v_target_status, true, v_changed_at;
end;
$$;

create or replace function private.get_admin_orders()
returns table(
  order_id uuid,
  order_number text,
  order_status text,
  payment_status text,
  currency_code text,
  subtotal_before_promotions text,
  promotion_discount_total text,
  coupon_discount_total text,
  merchandise_subtotal text,
  shipping_fee text,
  final_total text,
  customer_recipient_name text,
  customer_email text,
  customer_phone text,
  customer_country_code text,
  customer_administrative_area text,
  customer_city text,
  customer_address_line1 text,
  customer_delivery_notes text,
  created_at timestamptz,
  artisan_groups jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select private.is_super_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  return query
  select
    o.id as order_id,
    o.order_number,
    o.status as order_status,
    o.payment_status,
    o.currency_code,
    o.subtotal_before_promotions::text,
    o.promotion_discount_total::text,
    o.coupon_discount_total::text,
    o.merchandise_subtotal::text,
    o.shipping_fee::text,
    o.final_total::text,
    d.recipient_name as customer_recipient_name,
    d.email as customer_email,
    d.phone as customer_phone,
    d.country_code as customer_country_code,
    d.administrative_area as customer_administrative_area,
    d.city as customer_city,
    d.address_line1 as customer_address_line1,
    d.delivery_notes as customer_delivery_notes,
    o.created_at,
    coalesce(group_rows.artisan_groups, '[]'::jsonb) as artisan_groups
  from public.orders o
  left join public.order_customer_details d on d.order_id = o.id
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'artisanGroupId', g.id,
        'artisanId', g.artisan_id,
        'artisanNameAr', a.name_ar,
        'artisanNameEn', a.name_en,
        'fulfillmentStatus', g.fulfillment_status,
        'merchandiseSubtotal', g.merchandise_subtotal::text,
        'shipment', case when s.id is null then null else jsonb_build_object(
          'id', s.id,
          'status', s.status,
          'courierCode', s.courier_code,
          'trackingNumber', s.tracking_number,
          'trackingUrl', s.tracking_url,
          'shippedAt', s.shipped_at,
          'deliveredAt', s.delivered_at
        ) end,
        'items', coalesce(item_rows.items, '[]'::jsonb)
      )
      order by g.created_at, g.id
    ) as artisan_groups
    from public.order_artisan_groups g
    join public.artisan_profiles a on a.id = g.artisan_id
    left join public.shipments s on s.artisan_group_id = g.id
    left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'productSlug', oi.product_slug_snapshot,
          'productNameAr', oi.product_name_ar_snapshot,
          'productNameEn', oi.product_name_en_snapshot,
          'quantity', oi.quantity,
          'unitPrice', oi.unit_price::text,
          'originalLineTotal', oi.original_line_total::text,
          'promotionDiscount', oi.promotion_discount::text,
          'couponDiscount', oi.coupon_discount::text,
          'lineTotal', oi.line_total::text,
          'commissionRatePercent', oi.commission_rate_percent::text
        )
        order by oi.created_at, oi.id
      ) as items
      from public.order_items oi
      where oi.artisan_group_id = g.id
        and oi.artisan_id = g.artisan_id
    ) item_rows on true
    where g.order_id = o.id
  ) group_rows on true
  order by o.created_at desc, o.id;
end;
$$;

with inserted as (
  insert into public.shipments(order_id, artisan_group_id, status)
  select g.order_id, g.id, 'pending'
  from public.order_artisan_groups g
  where g.fulfillment_status = 'ready_for_courier_pickup'
  on conflict (artisan_group_id) do nothing
  returning id, order_id, artisan_group_id
)
insert into public.shipment_status_history(
  shipment_id, order_id, artisan_group_id, from_status, to_status, changed_by_user_id, source
)
select id, order_id, artisan_group_id, null, 'pending', null, 'migration_backfill'
from inserted;
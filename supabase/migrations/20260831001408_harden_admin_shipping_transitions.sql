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
  v_was_confirmed boolean := false;
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
  else
    select exists (
      select 1
      from public.order_status_history h
      where h.order_id = p_order_id
        and h.status = 'confirmed'
        and h.source = 'admin_confirmation'
    ) into v_was_confirmed;

    if not v_was_confirmed then
      raise exception 'invalid_order_confirmation_state';
    end if;
  end if;

  perform private.ensure_order_ready_shipments(p_order_id, v_user_id, 'admin_confirmation');
  v_final_status := private.recompute_order_status(p_order_id, v_user_id, 'order_aggregation');

  return query
  select p_order_id, v_current_status, v_final_status, v_changed, case when v_changed then v_changed_at else null::timestamptz end;
end;
$$;

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
  v_current_order_status text;
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

  select s.order_id, s.artisan_group_id, s.status, o.status
  into v_order_id, v_artisan_group_id, v_current_status, v_current_order_status
  from public.shipments s
  join public.orders o on o.id = s.order_id
  where s.id = p_shipment_id
  for update of s, o;

  if not found then
    raise exception 'shipment_not_found';
  end if;

  if v_current_order_status in ('received','cancelled','returned') then
    raise exception 'order_not_ready_for_shipping';
  end if;

  if v_current_status = v_target_status then
    return query
    select p_shipment_id, v_order_id, v_artisan_group_id, v_current_status, v_current_status, v_current_order_status, false, null::timestamptz;
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
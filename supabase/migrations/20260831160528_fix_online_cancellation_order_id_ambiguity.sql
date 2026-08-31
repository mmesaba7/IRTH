-- Fix PL/pgSQL output-column ambiguity in M2.3 online expiry cancellation.
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

  select o.* into v_order
  from public.orders o
  where o.id = p_order_id
  for update;
  if not found then raise exception 'order_not_found'; end if;

  select p.* into v_payment
  from private.payments p
  where p.order_id = p_order_id
  for update;
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
    where r.order_id = v_order.id
      and r.released_at is null
    group by r.product_id
  ), restored as (
    update public.products pr
    set quantity = pr.quantity + active.qty,
        updated_at = v_now
    from active
    where pr.id = active.product_id
      and pr.quantity is not null
    returning active.qty
  )
  select coalesce(sum(qty), 0)::integer
  into v_restored
  from restored;

  update private.order_inventory_reservations r
  set released_at = v_now,
      release_reason = 'online_payment_expired'
  where r.order_id = v_order.id
    and r.released_at is null;

  update private.payments p
  set status = 'cancelled',
      cancelled_at = v_now,
      paid_at = null,
      updated_at = v_now
  where p.id = v_payment.id;

  update public.orders o
  set payment_status = 'cancelled',
      status = 'cancelled',
      updated_at = v_now
  where o.id = v_order.id;

  insert into private.payment_events (
    payment_id, event_type, event_source, source_key,
    amount, currency_code, metadata
  ) values (
    v_payment.id,
    'payment_expired_order_cancelled',
    'system',
    trim(p_source_key),
    v_payment.amount,
    v_payment.currency_code,
    jsonb_build_object('restored_quantity', v_restored)
  );

  insert into public.order_status_history(order_id, status, changed_by, source, created_at)
  values (v_order.id, 'cancelled', null, 'online_payment_expired', v_now);

  return query
  select v_order.id, 'cancelled'::text, 'cancelled'::text, v_restored, true;
end;
$$;

revoke all on function private.cancel_expired_online_order(uuid,text)
from public, anon, authenticated, service_role;
grant execute on function private.cancel_expired_online_order(uuid,text) to service_role;

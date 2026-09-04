-- Server-side return invariant: a customer/guest cannot create a return
-- before the relevant artisan shipment has actually been delivered.
-- Fail closed as well if the snapshotted return window is unavailable.

create or replace function private.enforce_return_window_for_item()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_days integer;
  v_ends timestamptz;
  v_delivered timestamptz;
begin
  select s.return_window_days_snapshot, s.return_window_ends_at, s.delivered_at
  into v_days, v_ends, v_delivered
  from public.order_items oi
  left join public.shipments s on s.artisan_group_id = oi.artisan_group_id
  where oi.id = new.order_item_id;

  if not found then
    raise exception 'return_item_delivery_context_missing';
  end if;

  if v_delivered is null then
    raise exception 'return_requires_delivery';
  end if;

  if v_days is null or v_ends is null then
    raise exception 'return_window_unavailable';
  end if;

  if now() > v_ends then
    raise exception 'return_window_closed';
  end if;

  return new;
end;
$function$;

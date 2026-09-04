-- When every ordered quantity has been successfully refunded through the
-- approved return flow, the order should enter the approved terminal
-- Order Status v0.1 state: returned. Partial returns keep the order delivered.

create or replace function private.sync_order_returned_status_after_refund()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_all_items_refunded boolean;
  v_changed boolean := false;
begin
  if new.status <> 'succeeded' or old.status = 'succeeded' then
    return new;
  end if;

  select not exists (
    select 1
    from public.order_items oi
    where oi.order_id = new.order_id
      and coalesce((
        select sum(fi.quantity)::integer
        from private.refund_items fi
        join private.refunds fr on fr.id = fi.refund_id
        where fi.order_item_id = oi.id
          and fr.status = 'succeeded'
      ), 0) < oi.quantity
  ) into v_all_items_refunded;

  if v_all_items_refunded then
    update public.orders
    set status = 'returned', updated_at = now()
    where id = new.order_id
      and status <> 'returned';

    v_changed := found;

    if v_changed then
      insert into public.order_status_history(order_id, status, changed_by, source)
      values (new.order_id, 'returned', null, 'return_refund_aggregation');
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists refund_success_sync_order_returned on private.refunds;
create trigger refund_success_sync_order_returned
after update of status on private.refunds
for each row
execute function private.sync_order_returned_status_after_refund();

-- Bring any already-fully-refunded test/legacy order into the same invariant.
with candidates as (
  select o.id as order_id
  from public.orders o
  where o.status <> 'returned'
    and exists (select 1 from public.order_items oi where oi.order_id = o.id)
    and not exists (
      select 1
      from public.order_items oi
      where oi.order_id = o.id
        and coalesce((
          select sum(fi.quantity)::integer
          from private.refund_items fi
          join private.refunds fr on fr.id = fi.refund_id
          where fi.order_item_id = oi.id
            and fr.status = 'succeeded'
        ), 0) < oi.quantity
    )
), updated as (
  update public.orders o
  set status = 'returned', updated_at = now()
  from candidates c
  where o.id = c.order_id
  returning o.id
)
insert into public.order_status_history(order_id, status, changed_by, source)
select id, 'returned', null, 'return_refund_backfill'
from updated;

create index craft_commission_rates_updated_by_idx on public.craft_commission_rates(updated_by);
create index artisan_commission_overrides_updated_by_idx on public.artisan_commission_overrides(updated_by);
create index orders_market_id_idx on public.orders(market_id);
create index orders_coupon_id_idx on public.orders(coupon_id);
create index order_items_artisan_id_idx on public.order_items(artisan_id);
create index order_items_craft_id_idx on public.order_items(craft_id);
create index order_items_promotion_id_idx on public.order_items(promotion_id);
create index order_status_history_changed_by_idx on public.order_status_history(changed_by);

drop policy "Customers can read own orders" on public.orders;
drop policy "Super admin can read all orders" on public.orders;
create policy "Customer or super admin can read orders"
on public.orders
for select
to authenticated
using (
  (select auth.uid()) = customer_user_id
  or (select private.is_super_admin())
);

drop policy "Customers can read own order customer details" on public.order_customer_details;
drop policy "Super admin can read all order customer details" on public.order_customer_details;
create policy "Customer or super admin can read order customer details"
on public.order_customer_details
for select
to authenticated
using (
  (select private.is_super_admin())
  or exists (
    select 1 from public.orders o
    where o.id = order_customer_details.order_id
      and o.customer_user_id = (select auth.uid())
  )
);

drop policy "Customers can read own artisan groups" on public.order_artisan_groups;
drop policy "Super admin can read all artisan groups" on public.order_artisan_groups;
create policy "Customer or super admin can read artisan groups"
on public.order_artisan_groups
for select
to authenticated
using (
  (select private.is_super_admin())
  or exists (
    select 1 from public.orders o
    where o.id = order_artisan_groups.order_id
      and o.customer_user_id = (select auth.uid())
  )
);

drop policy "Customers can read own order items" on public.order_items;
drop policy "Super admin can read all order items" on public.order_items;
create policy "Customer or super admin can read order items"
on public.order_items
for select
to authenticated
using (
  (select private.is_super_admin())
  or exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.customer_user_id = (select auth.uid())
  )
);

drop policy "Customers can read own shipments" on public.shipments;
drop policy "Super admin can read all shipments" on public.shipments;
create policy "Customer or super admin can read shipments"
on public.shipments
for select
to authenticated
using (
  (select private.is_super_admin())
  or exists (
    select 1 from public.orders o
    where o.id = shipments.order_id
      and o.customer_user_id = (select auth.uid())
  )
);

drop policy "Customers can read own order status history" on public.order_status_history;
drop policy "Super admin can read all order status history" on public.order_status_history;
create policy "Customer or super admin can read order status history"
on public.order_status_history
for select
to authenticated
using (
  (select private.is_super_admin())
  or exists (
    select 1 from public.orders o
    where o.id = order_status_history.order_id
      and o.customer_user_id = (select auth.uid())
  )
);
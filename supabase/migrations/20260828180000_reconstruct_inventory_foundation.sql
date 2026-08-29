alter table public.products
add column quantity integer;

update public.products
set quantity = 0
where made_to_order = false
  and one_of_a_kind = false
  and quantity is null;

alter table public.products
add constraint products_fixed_stock_quantity_required_check
check (
  made_to_order
  or one_of_a_kind
  or quantity is not null
);

alter table public.products
add constraint products_inventory_mode_exclusive_check
check (
  not (made_to_order and one_of_a_kind)
);

alter table public.products
add constraint products_made_to_order_quantity_check
check (
  not made_to_order
  or quantity is null
);

alter table public.products
add constraint products_one_of_a_kind_quantity_check
check (
  not one_of_a_kind
  or (quantity is not null and quantity = 1)
);

alter table public.products
add constraint products_quantity_nonnegative_check
check (
  quantity is null
  or quantity >= 0
);
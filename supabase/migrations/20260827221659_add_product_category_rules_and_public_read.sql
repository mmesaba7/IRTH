create or replace function public.enforce_max_product_shopping_categories()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*)
    from public.product_shopping_categories
    where product_id = new.product_id
      and (
        tg_op = 'INSERT'
        or shopping_category_id <> old.shopping_category_id
      )
  ) >= 2 then
    raise exception 'A product can have a maximum of 2 shopping categories';
  end if;

  return new;
end;
$$;

create trigger enforce_max_product_shopping_categories_trigger
before insert or update
on public.product_shopping_categories
for each row
execute function public.enforce_max_product_shopping_categories();


grant select
on table public.product_shopping_categories
to anon, authenticated;


create policy "Public can read approved product shopping categories"
on public.product_shopping_categories
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_shopping_categories.product_id
      and products.status = 'approved'
  )
  and exists (
    select 1
    from public.shopping_categories
    where shopping_categories.id =
      product_shopping_categories.shopping_category_id
      and shopping_categories.is_active = true
  )
);
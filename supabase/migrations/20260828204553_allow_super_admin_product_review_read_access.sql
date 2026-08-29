create policy "Super admin can read all products"
on public.products
for select
to authenticated
using ((select private.is_super_admin()));

create policy "Super admin can read all product shopping categories"
on public.product_shopping_categories
for select
to authenticated
using ((select private.is_super_admin()));;

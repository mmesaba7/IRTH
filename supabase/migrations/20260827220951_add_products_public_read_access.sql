grant select on table public.products to anon, authenticated;

create policy "Public can read approved products"
on public.products
for select
to anon, authenticated
using (status = 'approved');
drop policy if exists "Public can read published products" on public.products;

create policy "Public can read published products from active artisans"
on public.products
for select
to anon, authenticated
using (
  lifecycle_status = 'published'
  and exists (
    select 1
    from public.artisan_profiles ap
    where ap.id = products.artisan_id
      and ap.status = 'active'
  )
);;

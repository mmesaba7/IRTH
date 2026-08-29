create policy "Artisans can read own products"
on public.products
for select
to authenticated
using (
  exists (
    select 1
    from public.artisan_profiles ap
    where ap.id = products.artisan_id
      and ap.auth_user_id = auth.uid()
  )
);
grant insert on table public.products to authenticated;

create policy "Artisans can create own draft products"
on public.products
for insert
to authenticated
with check (
  lifecycle_status = 'draft'
  and published_at is null
  and exists (
    select 1
    from public.artisan_profiles ap
    where ap.id = products.artisan_id
      and ap.auth_user_id = (select auth.uid())
      and ap.status = 'active'
  )
  and exists (
    select 1
    from public.crafts c
    where c.id = products.primary_craft_id
      and c.is_active = true
  )
);

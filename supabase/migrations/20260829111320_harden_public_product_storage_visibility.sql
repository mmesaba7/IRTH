drop policy if exists "Public can read published product storage"
on storage.objects;

create policy "Public can read published product storage"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.product_media pm
    join public.products p on p.id = pm.product_id
    join public.artisan_profiles ap on ap.id = p.artisan_id
    join public.countries co on co.id = ap.country_id
    join public.crafts c on c.id = p.primary_craft_id
    where pm.storage_path = objects.name
      and p.lifecycle_status = 'published'
      and ap.status = 'active'
      and co.is_active = true
      and c.is_active = true
  )
);
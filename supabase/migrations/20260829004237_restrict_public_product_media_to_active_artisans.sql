drop policy if exists "Public can read published product media" on public.product_media;

create policy "Public can read published product media from active artisans"
on public.product_media
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id = product_media.product_id
      and p.lifecycle_status = 'published'
      and ap.status = 'active'
  )
);;

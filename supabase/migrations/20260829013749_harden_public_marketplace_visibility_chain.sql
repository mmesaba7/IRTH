drop policy if exists "Public can read active artisan profiles" on public.artisan_profiles;
create policy "Public can read active artisan profiles"
on public.artisan_profiles for select
to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1 from public.countries co
    where co.id = artisan_profiles.country_id
      and co.is_active = true
  )
  and exists (
    select 1 from public.crafts c
    where c.id = artisan_profiles.primary_craft_id
      and c.is_active = true
  )
);

drop policy if exists "Public can read published products from active artisans" on public.products;
create policy "Public can read published products from active marketplace"
on public.products for select
to anon, authenticated
using (
  lifecycle_status = 'published'
  and exists (
    select 1
    from public.artisan_profiles ap
    join public.countries co on co.id = ap.country_id
    where ap.id = products.artisan_id
      and ap.status = 'active'
      and co.is_active = true
  )
  and exists (
    select 1 from public.crafts c
    where c.id = products.primary_craft_id
      and c.is_active = true
  )
);

drop policy if exists "Public can read published product media from active artisans" on public.product_media;
create policy "Public can read published product media from active marketplace"
on public.product_media for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    join public.countries co on co.id = ap.country_id
    join public.crafts c on c.id = p.primary_craft_id
    where p.id = product_media.product_id
      and p.lifecycle_status = 'published'
      and ap.status = 'active'
      and co.is_active = true
      and c.is_active = true
  )
);

drop policy if exists "Public can read artisan crafts" on public.artisan_crafts;
create policy "Public can read active artisan crafts"
on public.artisan_crafts for select
to anon, authenticated
using (
  exists (
    select 1
    from public.artisan_profiles ap
    join public.countries co on co.id = ap.country_id
    where ap.id = artisan_crafts.artisan_id
      and ap.status = 'active'
      and co.is_active = true
  )
  and exists (
    select 1 from public.crafts c
    where c.id = artisan_crafts.craft_id
      and c.is_active = true
  )
);

drop policy if exists "Public can read published product shopping categories" on public.product_shopping_categories;
create policy "Public can read active product shopping categories"
on public.product_shopping_categories for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    join public.countries co on co.id = ap.country_id
    join public.crafts c on c.id = p.primary_craft_id
    where p.id = product_shopping_categories.product_id
      and p.lifecycle_status = 'published'
      and ap.status = 'active'
      and co.is_active = true
      and c.is_active = true
  )
  and exists (
    select 1 from public.shopping_categories sc
    where sc.id = product_shopping_categories.shopping_category_id
      and sc.is_active = true
  )
);;

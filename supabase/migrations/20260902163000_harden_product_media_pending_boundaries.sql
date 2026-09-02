create or replace function public.reorder_product_images(
  p_product_id uuid,
  p_media_ids uuid[]
)
returns void
language plpgsql
set search_path to ''
as $$
declare
  caller_id uuid := (select auth.uid());
  expected_count integer;
  provided_count integer;
  distinct_count integer;
  media_id uuid;
  position_index integer := 0;
begin
  if caller_id is null then
    raise exception 'not authorized';
  end if;

  if not exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id = p_product_id
      and p.archived_at is null
      and ap.auth_user_id = caller_id
      and ap.status = 'active'
  ) then
    raise exception 'product not found or unavailable';
  end if;

  if private.product_has_pending_publish_review(p_product_id) then
    raise exception 'product is pending review';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_product_id::text, 0)
  );

  provided_count := coalesce(pg_catalog.array_length(p_media_ids, 1), 0);

  select count(*)
    into expected_count
  from public.product_media
  where product_id = p_product_id
    and media_type = 'image';

  if provided_count <> expected_count then
    raise exception 'Image reorder must include every product image exactly once';
  end if;

  select count(distinct value)
    into distinct_count
  from pg_catalog.unnest(p_media_ids) as value;

  if distinct_count <> provided_count then
    raise exception 'Image reorder contains duplicate media ids';
  end if;

  if exists (
    select 1
    from pg_catalog.unnest(p_media_ids) as requested(id)
    where not exists (
      select 1
      from public.product_media pm
      where pm.id = requested.id
        and pm.product_id = p_product_id
        and pm.media_type = 'image'
    )
  ) then
    raise exception 'Image reorder contains media that does not belong to this product';
  end if;

  update public.product_media
  set sort_order = sort_order + 1000,
      updated_at = pg_catalog.now()
  where product_id = p_product_id
    and media_type = 'image';

  foreach media_id in array p_media_ids
  loop
    update public.product_media
    set sort_order = position_index,
        updated_at = pg_catalog.now()
    where id = media_id
      and product_id = p_product_id
      and media_type = 'image';

    position_index := position_index + 1;
  end loop;
end;
$$;

revoke all on function public.reorder_product_images(uuid, uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.reorder_product_images(uuid, uuid[]) to authenticated;

drop policy if exists "Artisans can upload own product storage" on storage.objects;
create policy "Artisans can upload own product storage"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id::text = (storage.foldername(objects.name))[2]
      and p.artisan_id::text = (storage.foldername(objects.name))[1]
      and p.archived_at is null
      and ap.auth_user_id = (select auth.uid())
      and ap.status = 'active'
      and not private.product_has_pending_publish_review(p.id)
  )
);

drop policy if exists "Artisans can update own product storage" on storage.objects;
create policy "Artisans can update own product storage"
on storage.objects for update to authenticated
using (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id::text = (storage.foldername(objects.name))[2]
      and p.artisan_id::text = (storage.foldername(objects.name))[1]
      and p.archived_at is null
      and ap.auth_user_id = (select auth.uid())
      and ap.status = 'active'
      and not private.product_has_pending_publish_review(p.id)
  )
)
with check (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id::text = (storage.foldername(objects.name))[2]
      and p.artisan_id::text = (storage.foldername(objects.name))[1]
      and p.archived_at is null
      and ap.auth_user_id = (select auth.uid())
      and ap.status = 'active'
      and not private.product_has_pending_publish_review(p.id)
  )
);

drop policy if exists "Artisans can delete own product storage" on storage.objects;
create policy "Artisans can delete own product storage"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id::text = (storage.foldername(objects.name))[2]
      and p.artisan_id::text = (storage.foldername(objects.name))[1]
      and p.archived_at is null
      and ap.auth_user_id = (select auth.uid())
      and ap.status = 'active'
      and not private.product_has_pending_publish_review(p.id)
  )
);

drop policy if exists "Artisans can read own product storage" on storage.objects;
create policy "Artisans can read own product storage"
on storage.objects for select to authenticated
using (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id::text = (storage.foldername(objects.name))[2]
      and p.artisan_id::text = (storage.foldername(objects.name))[1]
      and p.archived_at is null
      and ap.auth_user_id = (select auth.uid())
  )
);

drop policy if exists "Public can read published product storage" on storage.objects;
create policy "Public can read published product storage"
on storage.objects for select to anon, authenticated
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
      and p.archived_at is null
      and p.lifecycle_status = 'published'
      and ap.status = 'active'
      and co.is_active = true
      and c.is_active = true
  )
);
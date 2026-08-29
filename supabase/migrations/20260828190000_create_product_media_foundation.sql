create table public.product_media (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null
    references public.products(id)
    on delete cascade,

  media_type text not null,

  storage_path text not null,

  sort_order integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_media_type_check
    check (media_type in ('image', 'video')),

  constraint product_media_sort_order_check
    check (
      (
        media_type = 'image'
        and sort_order is not null
        and sort_order >= 0
      )
      or
      (
        media_type = 'video'
        and sort_order is null
      )
    ),

  constraint product_media_storage_path_unique
    unique (storage_path)
);

create unique index product_media_one_video_per_product_idx
  on public.product_media (product_id)
  where media_type = 'video';

create unique index product_media_image_sort_order_unique_idx
  on public.product_media (product_id, sort_order)
  where media_type = 'image';
  create or replace function public.enforce_product_media_limits()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  image_count integer;
begin
  -- Serialize media changes for the same product without requiring
  -- UPDATE permission on public.products.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.product_id::text, 0)
  );

  if new.media_type = 'image' then
    select count(*)
      into image_count
    from public.product_media pm
    where pm.product_id = new.product_id
      and pm.media_type = 'image'
      and (tg_op = 'INSERT' or pm.id <> new.id);

    if image_count >= 8 then
      raise exception 'A product can have at most 8 images';
    end if;
  end if;

  return new;
end;
$$;

create trigger product_media_limits_trigger
before insert or update of product_id, media_type
on public.product_media
for each row
execute function public.enforce_product_media_limits();
alter table public.product_media enable row level security;

revoke all on table public.product_media from anon;
revoke all on table public.product_media from authenticated;

grant select on table public.product_media to anon;

grant select, insert, update, delete
on table public.product_media
to authenticated;

revoke all on function public.enforce_product_media_limits() from public;
create policy "Artisans can read own product media"
on public.product_media
for select
to authenticated
using (
  exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id = product_media.product_id
      and ap.auth_user_id = (select auth.uid())
  )
);

create policy "Artisans can insert own product media"
on public.product_media
for insert
to authenticated
with check (
  exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id = product_media.product_id
      and ap.auth_user_id = (select auth.uid())
  )
);

create policy "Artisans can update own product media"
on public.product_media
for update
to authenticated
using (
  exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id = product_media.product_id
      and ap.auth_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id = product_media.product_id
      and ap.auth_user_id = (select auth.uid())
  )
);

create policy "Artisans can delete own product media"
on public.product_media
for delete
to authenticated
using (
  exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id = product_media.product_id
      and ap.auth_user_id = (select auth.uid())
  )
);

create policy "Super admin can manage product media"
on public.product_media
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = (select auth.uid())
      and r.code = 'super_admin'
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = (select auth.uid())
      and r.code = 'super_admin'
  )
);
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-media',
  'product-media',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4'
  ]
);

create policy "Artisans can read own product storage"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id::text = (storage.foldername(objects.name))[2]
      and p.artisan_id::text = (storage.foldername(objects.name))[1]
      and ap.auth_user_id = (select auth.uid())
  )
);

create policy "Artisans can upload own product storage"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id::text = (storage.foldername(objects.name))[2]
      and p.artisan_id::text = (storage.foldername(objects.name))[1]
      and ap.auth_user_id = (select auth.uid())
  )
);

create policy "Artisans can update own product storage"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id::text = (storage.foldername(objects.name))[2]
      and p.artisan_id::text = (storage.foldername(objects.name))[1]
      and ap.auth_user_id = (select auth.uid())
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
      and ap.auth_user_id = (select auth.uid())
  )
);

create policy "Artisans can delete own product storage"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id::text = (storage.foldername(objects.name))[2]
      and p.artisan_id::text = (storage.foldername(objects.name))[1]
      and ap.auth_user_id = (select auth.uid())
  )
);

create policy "Super admin can manage product storage"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = (select auth.uid())
      and r.code = 'super_admin'
  )
)
with check (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = (select auth.uid())
      and r.code = 'super_admin'
  )
);
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
    where pm.storage_path = objects.name
      and p.lifecycle_status = 'published'
  )
);
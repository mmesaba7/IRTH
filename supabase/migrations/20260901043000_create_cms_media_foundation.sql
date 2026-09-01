create table if not exists private.cms_media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 5242880),
  status text not null default 'pending' check (status in ('pending','ready')),
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);

create index if not exists cms_media_assets_created_by_idx
  on private.cms_media_assets(created_by_user_id);
create index if not exists cms_media_assets_status_idx
  on private.cms_media_assets(status, created_at desc);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
  'cms-media',
  'cms-media',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.create_admin_cms_media_asset(
  p_storage_path text,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_admin_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.require_super_admin_user(p_admin_user_id);

  if p_storage_path is null or p_storage_path !~ '^cms/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' then
    raise exception 'invalid_cms_media_path';
  end if;

  if p_mime_type not in ('image/jpeg','image/png','image/webp') then
    raise exception 'unsupported_cms_media_type';
  end if;

  if p_file_size_bytes is null or p_file_size_bytes <= 0 or p_file_size_bytes > 5242880 then
    raise exception 'invalid_cms_media_size';
  end if;

  insert into private.cms_media_assets(storage_path,mime_type,file_size_bytes,created_by_user_id)
  values (p_storage_path,p_mime_type,p_file_size_bytes,p_admin_user_id)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.finalize_admin_cms_media_asset(
  p_asset_id uuid,
  p_actual_mime_type text,
  p_actual_file_size_bytes bigint,
  p_admin_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset private.cms_media_assets%rowtype;
begin
  perform private.require_super_admin_user(p_admin_user_id);

  select * into v_asset
  from private.cms_media_assets
  where id = p_asset_id
  for update;

  if not found then raise exception 'cms_media_asset_not_found'; end if;
  if v_asset.created_by_user_id <> p_admin_user_id then raise exception 'cms_media_asset_owner_mismatch'; end if;
  if v_asset.status = 'ready' then
    return jsonb_build_object('id',v_asset.id,'status',v_asset.status,'storagePath',v_asset.storage_path,'mimeType',v_asset.mime_type,'fileSizeBytes',v_asset.file_size_bytes);
  end if;
  if p_actual_mime_type <> v_asset.mime_type then raise exception 'cms_media_mime_mismatch'; end if;
  if p_actual_file_size_bytes <> v_asset.file_size_bytes then raise exception 'cms_media_size_mismatch'; end if;

  update private.cms_media_assets
  set status='ready', finalized_at=now()
  where id=v_asset.id
  returning * into v_asset;

  return jsonb_build_object('id',v_asset.id,'status',v_asset.status,'storagePath',v_asset.storage_path,'mimeType',v_asset.mime_type,'fileSizeBytes',v_asset.file_size_bytes,'finalizedAt',v_asset.finalized_at);
end;
$$;

create or replace function public.get_admin_cms_media_assets(p_admin_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_result jsonb;
begin
  perform private.require_super_admin_user(p_admin_user_id);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,
    'storagePath',a.storage_path,
    'mimeType',a.mime_type,
    'fileSizeBytes',a.file_size_bytes,
    'status',a.status,
    'createdAt',a.created_at,
    'finalizedAt',a.finalized_at
  ) order by a.created_at desc),'[]'::jsonb)
  into v_result
  from private.cms_media_assets a;
  return v_result;
end;
$$;

create or replace function public.get_cms_media_asset_server(p_asset_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select case when a.status <> 'ready' then null else jsonb_build_object(
    'id',a.id,
    'storagePath',a.storage_path,
    'mimeType',a.mime_type,
    'fileSizeBytes',a.file_size_bytes
  ) end
  from private.cms_media_assets a
  where a.id=p_asset_id;
$$;

revoke all on private.cms_media_assets from anon, authenticated;
revoke all on function public.create_admin_cms_media_asset(text,text,bigint,uuid) from public, anon, authenticated;
revoke all on function public.finalize_admin_cms_media_asset(uuid,text,bigint,uuid) from public, anon, authenticated;
revoke all on function public.get_admin_cms_media_assets(uuid) from public, anon, authenticated;
revoke all on function public.get_cms_media_asset_server(uuid) from public, anon, authenticated;
grant execute on function public.create_admin_cms_media_asset(text,text,bigint,uuid) to service_role;
grant execute on function public.finalize_admin_cms_media_asset(uuid,text,bigint,uuid) to service_role;
grant execute on function public.get_admin_cms_media_assets(uuid) to service_role;
grant execute on function public.get_cms_media_asset_server(uuid) to service_role;

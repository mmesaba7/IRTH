create table if not exists private.cms_video_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  mime_type text not null check (mime_type = 'video/mp4'),
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 262144000),
  duration_seconds numeric(8,3),
  status text not null default 'pending' check (status in ('pending','ready')),
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  constraint cms_video_ready_metadata_check check (
    (status = 'pending' and duration_seconds is null and finalized_at is null)
    or
    (status = 'ready' and duration_seconds is not null and duration_seconds > 0 and duration_seconds <= 180 and finalized_at is not null)
  )
);

create index if not exists cms_video_assets_created_by_idx on private.cms_video_assets(created_by_user_id, created_at desc);
create index if not exists cms_video_assets_status_idx on private.cms_video_assets(status, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cms-videos', 'cms-videos', false, 262144000, array['video/mp4']::text[])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

revoke all on private.cms_video_assets from anon, authenticated;

create or replace function public.create_admin_cms_video_asset(
  p_storage_path text,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_admin_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset private.cms_video_assets;
begin
  perform private.require_super_admin_user(p_admin_user_id);
  if p_storage_path is null or length(trim(p_storage_path)) < 10 then raise exception 'invalid_storage_path'; end if;
  if p_mime_type <> 'video/mp4' then raise exception 'invalid_video_type'; end if;
  if p_file_size_bytes is null or p_file_size_bytes <= 0 or p_file_size_bytes > 262144000 then raise exception 'invalid_video_size'; end if;

  insert into private.cms_video_assets(storage_path, mime_type, file_size_bytes, created_by_user_id)
  values (trim(p_storage_path), p_mime_type, p_file_size_bytes, p_admin_user_id)
  returning * into v_asset;

  return jsonb_build_object(
    'id', v_asset.id,
    'storagePath', v_asset.storage_path,
    'mimeType', v_asset.mime_type,
    'fileSizeBytes', v_asset.file_size_bytes,
    'status', v_asset.status
  );
end;
$$;

create or replace function public.finalize_admin_cms_video_asset(
  p_asset_id uuid,
  p_actual_mime_type text,
  p_actual_file_size_bytes bigint,
  p_duration_seconds numeric,
  p_admin_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset private.cms_video_assets;
begin
  perform private.require_super_admin_user(p_admin_user_id);

  select * into v_asset
  from private.cms_video_assets
  where id = p_asset_id and status = 'pending'
  for update;

  if not found then raise exception 'video_asset_not_pending'; end if;
  if p_actual_mime_type <> 'video/mp4' or p_actual_mime_type <> v_asset.mime_type then raise exception 'video_type_mismatch'; end if;
  if p_actual_file_size_bytes <> v_asset.file_size_bytes or p_actual_file_size_bytes > 262144000 then raise exception 'video_size_mismatch'; end if;
  if p_duration_seconds is null or p_duration_seconds <= 0 or p_duration_seconds > 180 then raise exception 'video_duration_invalid'; end if;

  update private.cms_video_assets
  set duration_seconds = p_duration_seconds,
      status = 'ready',
      finalized_at = now()
  where id = p_asset_id
  returning * into v_asset;

  return jsonb_build_object(
    'id', v_asset.id,
    'storagePath', v_asset.storage_path,
    'mimeType', v_asset.mime_type,
    'fileSizeBytes', v_asset.file_size_bytes,
    'durationSeconds', v_asset.duration_seconds,
    'status', v_asset.status
  );
end;
$$;

create or replace function public.get_admin_cms_video_assets(p_admin_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_super_admin_user(p_admin_user_id);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id,
      'storagePath', a.storage_path,
      'mimeType', a.mime_type,
      'fileSizeBytes', a.file_size_bytes,
      'durationSeconds', a.duration_seconds,
      'status', a.status,
      'createdAt', a.created_at,
      'finalizedAt', a.finalized_at
    ) order by a.created_at desc)
    from private.cms_video_assets a
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_cms_video_asset_server(p_asset_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'storagePath', a.storage_path,
    'mimeType', a.mime_type,
    'fileSizeBytes', a.file_size_bytes,
    'durationSeconds', a.duration_seconds
  )
  from private.cms_video_assets a
  where a.id = p_asset_id and a.status = 'ready';
$$;

revoke all on function public.create_admin_cms_video_asset(text,text,bigint,uuid) from public, anon, authenticated;
revoke all on function public.finalize_admin_cms_video_asset(uuid,text,bigint,numeric,uuid) from public, anon, authenticated;
revoke all on function public.get_admin_cms_video_assets(uuid) from public, anon, authenticated;
revoke all on function public.get_cms_video_asset_server(uuid) from public, anon, authenticated;
grant execute on function public.create_admin_cms_video_asset(text,text,bigint,uuid) to service_role;
grant execute on function public.finalize_admin_cms_video_asset(uuid,text,bigint,numeric,uuid) to service_role;
grant execute on function public.get_admin_cms_video_assets(uuid) to service_role;
grant execute on function public.get_cms_video_asset_server(uuid) to service_role;

drop policy if exists cms_videos_super_admin_insert on storage.objects;
create policy cms_videos_super_admin_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'cms-videos'
  and private.is_super_admin_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

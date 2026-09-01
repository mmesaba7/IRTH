drop policy if exists cms_videos_super_admin_insert on storage.objects;

create policy cms_videos_super_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cms-videos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = (select auth.uid())
      and r.code = 'super_admin'
  )
);

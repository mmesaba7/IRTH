create schema if not exists private;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = (select auth.uid())
      and r.code = 'super_admin'
  );
$$;

revoke all on function private.is_super_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_super_admin() to authenticated;

drop policy if exists "Super admin can read moderation requests"
on public.moderation_requests;

drop policy if exists "Super admin can update moderation requests"
on public.moderation_requests;

create policy "Super admin can read moderation requests"
on public.moderation_requests
for select
to authenticated
using ((select private.is_super_admin()));

create policy "Super admin can update moderation requests"
on public.moderation_requests
for update
to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));;

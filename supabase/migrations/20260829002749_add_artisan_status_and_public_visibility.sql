alter table public.artisan_profiles
add column status text;

update public.artisan_profiles
set status = 'active'
where status is null;

alter table public.artisan_profiles
alter column status set default 'pending_verification',
alter column status set not null;

alter table public.artisan_profiles
add constraint artisan_profiles_status_check
check (status in ('pending_verification', 'active', 'under_review', 'suspended', 'deactivated'));

drop policy if exists "Public can read artisan profiles" on public.artisan_profiles;

create policy "Public can read active artisan profiles"
on public.artisan_profiles
for select
to anon, authenticated
using (status = 'active');

create policy "Artisans can read own profile"
on public.artisan_profiles
for select
to authenticated
using ((select auth.uid()) = auth_user_id);

create policy "Super admin can read all artisan profiles"
on public.artisan_profiles
for select
to authenticated
using ((select private.is_super_admin()));;

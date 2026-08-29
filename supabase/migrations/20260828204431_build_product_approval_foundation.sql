alter table public.moderation_requests
add column requested_by uuid references auth.users(id) on delete set null,
add column reviewed_by uuid references auth.users(id) on delete set null;

create unique index moderation_requests_one_pending_per_subject_action_idx
on public.moderation_requests (subject_type, subject_id, action)
where status = 'pending';

grant select, insert, update
on table public.moderation_requests
to authenticated;

create policy "Artisans can read own product moderation requests"
on public.moderation_requests
for select
to authenticated
using (
  subject_type = 'product'
  and exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id = moderation_requests.subject_id
      and ap.auth_user_id = (select auth.uid())
  )
);

create policy "Artisans can submit own product moderation requests"
on public.moderation_requests
for insert
to authenticated
with check (
  subject_type = 'product'
  and action = 'publish'
  and status = 'pending'
  and requested_by = (select auth.uid())
  and reviewed_by is null
  and reviewed_at is null
  and admin_note is null
  and exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id = moderation_requests.subject_id
      and p.lifecycle_status = 'draft'
      and ap.auth_user_id = (select auth.uid())
  )
);

create policy "Super admin can read moderation requests"
on public.moderation_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = (select auth.uid())
      and r.code = 'super_admin'
  )
);

create policy "Super admin can update moderation requests"
on public.moderation_requests
for update
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

create or replace function public.apply_product_moderation_decision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'pending' or new.status = old.status then
    return new;
  end if;

  if new.subject_type <> 'product' or new.action <> 'publish' then
    return new;
  end if;

  if new.status not in ('approved', 'rejected') then
    raise exception 'Invalid moderation decision';
  end if;

  if new.reviewed_by is distinct from (select auth.uid()) then
    raise exception 'reviewed_by must match the current user';
  end if;

  new.reviewed_at := pg_catalog.now();

  if new.status = 'approved' then
    update public.products
    set lifecycle_status = 'published',
        updated_at = pg_catalog.now()
    where id = new.subject_id
      and lifecycle_status = 'draft';

    if not found then
      raise exception 'Product is not available for publication';
    end if;
  end if;

  return new;
end;
$$;

create trigger apply_product_moderation_decision_trigger
before update of status on public.moderation_requests
for each row
execute function public.apply_product_moderation_decision();

revoke execute on function public.apply_product_moderation_decision()
from public, anon, authenticated, service_role;;

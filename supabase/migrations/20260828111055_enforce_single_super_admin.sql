create or replace function public.enforce_single_super_admin()
returns trigger
language plpgsql
as $$
declare
  super_admin_role_id uuid;
begin
  select id
  into super_admin_role_id
  from public.roles
  where code = 'super_admin';

  if new.role_id = super_admin_role_id then
    if exists (
      select 1
      from public.user_roles
      where role_id = super_admin_role_id
        and user_id <> new.user_id
    ) then
      raise exception 'Only one Super Admin is allowed in the MVP';
    end if;
  end if;

  return new;
end;
$$;

create trigger enforce_single_super_admin_trigger
before insert or update
on public.user_roles
for each row
execute function public.enforce_single_super_admin();
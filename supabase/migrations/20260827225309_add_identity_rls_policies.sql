-- =========================================================
-- USER ACCOUNTS
-- User can access only their own account
-- =========================================================

grant select, insert, update
on table public.user_accounts
to authenticated;


create policy "Users can read own account"
on public.user_accounts
for select
to authenticated
using (
  user_id = (select auth.uid())
);


create policy "Users can create own account"
on public.user_accounts
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);


create policy "Users can update own account"
on public.user_accounts
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);


-- =========================================================
-- ROLES
-- Role definitions are readable but not editable by users
-- =========================================================

grant select
on table public.roles
to authenticated;


create policy "Authenticated users can read roles"
on public.roles
for select
to authenticated
using (true);


-- =========================================================
-- USER ROLES
-- User can see their own roles only
-- They CANNOT assign or change roles
-- =========================================================

grant select
on table public.user_roles
to authenticated;


create policy "Users can read own roles"
on public.user_roles
for select
to authenticated
using (
  user_id = (select auth.uid())
);
grant insert
on table public.user_roles
to authenticated;

create policy "Users can assign own customer role"
on public.user_roles
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role_id = (
    select id
    from public.roles
    where code = 'customer'
  )
);
grant select on table public.crafts to anon, authenticated;

create policy "Public can read active crafts"
on public.crafts
for select
to anon, authenticated
using (is_active = true);
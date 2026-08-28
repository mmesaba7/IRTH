grant select on table public.artisan_profiles to anon, authenticated;
grant select on table public.artisan_crafts to anon, authenticated;

create policy "Public can read artisan profiles"
on public.artisan_profiles
for select
to anon, authenticated
using (true);

create policy "Public can read artisan crafts"
on public.artisan_crafts
for select
to anon, authenticated
using (true);
create policy "Public can read active countries"
on public.countries
for select
to anon, authenticated
using (is_active = true);
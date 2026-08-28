grant select on table public.shopping_categories to anon, authenticated;

create policy "Public can read active shopping categories"
on public.shopping_categories
for select
to anon, authenticated
using (is_active = true);
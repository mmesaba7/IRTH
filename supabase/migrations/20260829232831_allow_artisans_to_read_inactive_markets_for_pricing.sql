-- S15.1 — Allow artisans to prepare prices for inactive markets
--
-- Public/anonymous users must still see only active markets.
-- Authenticated artisans may read inactive markets only for pricing preparation.

create policy "Authenticated artisans can read markets for pricing preparation"
on public.markets
for select
to authenticated
using (
  exists (
    select 1
    from public.artisan_profiles ap
    where ap.auth_user_id = (select auth.uid())
  )
);

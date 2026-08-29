create index if not exists promotions_created_by_idx on public.promotions(created_by);
create index if not exists promotions_reviewed_by_idx on public.promotions(reviewed_by);

drop policy if exists "Artisans can read own promotions" on public.promotions;
drop policy if exists "Super admin can read promotions" on public.promotions;

create policy "Authorized users can read promotions"
on public.promotions
for select
to authenticated
using (
  (select private.is_super_admin())
  or (
    source_type = 'artisan'
    and exists (
      select 1
      from public.artisan_profiles ap
      where ap.id = promotions.artisan_id
        and ap.auth_user_id = (select auth.uid())
    )
  )
);

drop policy if exists "Artisans can read own promotion products" on public.promotion_products;
drop policy if exists "Super admin can read promotion products" on public.promotion_products;

create policy "Authorized users can read promotion products"
on public.promotion_products
for select
to authenticated
using (
  (select private.is_super_admin())
  or exists (
    select 1
    from public.promotions pr
    join public.artisan_profiles ap on ap.id = pr.artisan_id
    where pr.id = promotion_products.promotion_id
      and pr.source_type = 'artisan'
      and ap.auth_user_id = (select auth.uid())
  )
);;

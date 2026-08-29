create or replace function private.product_has_pending_publish_review(target_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.moderation_requests mr
    where mr.subject_type = 'product'
      and mr.subject_id = target_product_id
      and mr.action = 'publish'
      and mr.status = 'pending'
  );
$$;

revoke all on function private.product_has_pending_publish_review(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.product_has_pending_publish_review(uuid) to authenticated;

drop policy if exists "Artisans can update own editable draft products" on public.products;

create policy "Artisans can update own editable draft products"
on public.products
for update
to authenticated
using (
  lifecycle_status = 'draft'
  and exists (
    select 1
    from public.artisan_profiles ap
    where ap.id = products.artisan_id
      and ap.auth_user_id = auth.uid()
  )
  and not private.product_has_pending_publish_review(products.id)
)
with check (
  lifecycle_status = 'draft'
  and exists (
    select 1
    from public.artisan_profiles ap
    where ap.id = products.artisan_id
      and ap.auth_user_id = auth.uid()
  )
  and not private.product_has_pending_publish_review(products.id)
);;

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
  and not exists (
    select 1
    from public.moderation_requests mr
    where mr.subject_type = 'product'
      and mr.subject_id = products.id
      and mr.action = 'publish'
      and mr.status = 'pending'
  )
)
with check (
  lifecycle_status = 'draft'
  and exists (
    select 1
    from public.artisan_profiles ap
    where ap.id = products.artisan_id
      and ap.auth_user_id = auth.uid()
  )
  and not exists (
    select 1
    from public.moderation_requests mr
    where mr.subject_type = 'product'
      and mr.subject_id = products.id
      and mr.action = 'publish'
      and mr.status = 'pending'
  )
);;

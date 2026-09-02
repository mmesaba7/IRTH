create or replace function private.product_has_pending_publish_review(target_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
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

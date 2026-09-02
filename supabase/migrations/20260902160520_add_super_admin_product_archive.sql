create or replace function public.admin_archive_product(
  target_product_id uuid,
  target_reason text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  clean_reason text := pg_catalog.btrim(coalesce(target_reason, ''));
  product_name_ar text;
  product_name_en text;
  previous_status text;
  artisan_user_id uuid;
  audit_id uuid;
begin
  if caller_id is null or not private.is_super_admin() then
    raise exception 'not authorized';
  end if;

  if clean_reason = '' or pg_catalog.char_length(clean_reason) > 500 then
    raise exception 'archive reason is required and must be 500 characters or fewer';
  end if;

  select p.name_ar, p.name_en, p.lifecycle_status, ap.auth_user_id
    into product_name_ar, product_name_en, previous_status, artisan_user_id
  from public.products p
  join public.artisan_profiles ap on ap.id = p.artisan_id
  where p.id = target_product_id
    and p.archived_at is null
  for update of p;

  if not found then
    raise exception 'product not found or already archived';
  end if;

  update public.moderation_requests
  set status = 'rejected',
      admin_note = clean_reason,
      reviewed_by = caller_id,
      reviewed_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where subject_type = 'product'
    and subject_id = target_product_id
    and action = 'publish'
    and status = 'pending';

  update public.products
  set lifecycle_status = 'draft',
      archived_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where id = target_product_id;

  insert into public.moderation_requests (
    subject_type,
    subject_id,
    action,
    status,
    proposed_data,
    admin_note,
    submitted_at,
    reviewed_at,
    requested_by,
    reviewed_by
  ) values (
    'product',
    target_product_id,
    'update',
    'approved',
    pg_catalog.jsonb_build_object(
      'admin_archive', true,
      'previous_lifecycle_status', previous_status
    ),
    clean_reason,
    pg_catalog.now(),
    pg_catalog.now(),
    caller_id,
    caller_id
  )
  returning id into audit_id;

  if artisan_user_id is not null then
    perform private.emit_notification(
      artisan_user_id,
      'product_archived_by_irth',
      'تمت إزالة منتج من IRTH',
      'Product removed by IRTH',
      pg_catalog.format(
        'تمت إزالة المنتج %s من IRTH. السبب: %s',
        coalesce(product_name_ar, product_name_en),
        clean_reason
      ),
      pg_catalog.format(
        'Your product %s was removed from IRTH. Reason: %s',
        product_name_en,
        clean_reason
      ),
      '/artisan/products',
      'product',
      target_product_id,
      pg_catalog.format('inapp:artisan:%s:product-archive:%s', artisan_user_id, audit_id)
    );
  end if;

  return target_product_id;
end;
$function$;

revoke all on function public.admin_archive_product(uuid, text) from public;
revoke all on function public.admin_archive_product(uuid, text) from anon;
revoke all on function public.admin_archive_product(uuid, text) from service_role;
grant execute on function public.admin_archive_product(uuid, text) to authenticated;

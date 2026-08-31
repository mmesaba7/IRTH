create or replace function private.handle_product_moderation_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_name_ar text;
  v_product_name_en text;
  v_artisan_user_id uuid;
  v_artisan_email text;
  v_event_key text;
  v_title_ar text;
  v_title_en text;
  v_body_ar text;
  v_body_en text;
begin
  if new.subject_type <> 'product'
     or new.action <> 'publish'
     or new.status not in ('approved','rejected')
     or new.status is not distinct from old.status then
    return new;
  end if;

  select p.name_ar, p.name_en, a.auth_user_id, u.email
    into v_product_name_ar, v_product_name_en, v_artisan_user_id, v_artisan_email
  from public.products p
  join public.artisan_profiles a on a.id = p.artisan_id
  left join auth.users u on u.id = a.auth_user_id
  where p.id = new.subject_id;

  if not found or v_artisan_user_id is null then
    return new;
  end if;

  if new.status = 'approved' then
    v_event_key := 'product_approved';
    v_title_ar := 'تمت الموافقة على منتجك';
    v_title_en := 'Product approved';
    v_body_ar := format('تمت الموافقة على نشر المنتج %s.', coalesce(v_product_name_ar, v_product_name_en));
    v_body_en := format('Your product %s was approved for publishing.', v_product_name_en);
  else
    v_event_key := 'product_rejected';
    v_title_ar := 'يحتاج منتجك إلى تعديل';
    v_title_en := 'Product needs changes';
    v_body_ar := format('لم تتم الموافقة على نشر المنتج %s. راجع ملاحظات IRTH.', coalesce(v_product_name_ar, v_product_name_en));
    v_body_en := format('Your product %s was not approved. Review the IRTH feedback.', v_product_name_en);
  end if;

  perform private.emit_notification(
    v_artisan_user_id,v_event_key,v_title_ar,v_title_en,v_body_ar,v_body_en,
    '/artisan/products','product',new.subject_id,
    format('inapp:artisan:%s:moderation:%s:%s',v_artisan_user_id,new.id,new.status)
  );

  if v_artisan_email is not null and trim(v_artisan_email) <> '' then
    perform private.enqueue_notification_email(
      v_event_key,v_artisan_email,'auto',v_event_key,
      jsonb_build_object('productId',new.subject_id,'moderationRequestId',new.id,'audience','artisan','status',new.status),
      'product',new.subject_id,
      format('email:artisan:%s:moderation:%s:%s',v_artisan_user_id,new.id,new.status)
    );
  end if;

  return new;
end;
$$;

revoke all on function private.handle_product_moderation_notification() from public, anon, authenticated;

drop trigger if exists product_moderation_notification_trigger on public.moderation_requests;
create trigger product_moderation_notification_trigger
after update of status on public.moderation_requests
for each row execute function private.handle_product_moderation_notification();

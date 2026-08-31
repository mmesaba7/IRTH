create or replace function private.assert_customer_account_active(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if p_user_id is null then return; end if;
  if coalesce((select c.is_suspended from private.customer_account_controls c where c.customer_user_id=p_user_id),false) then
    raise exception 'customer_account_suspended' using errcode='42501';
  end if;
end;
$function$;

create or replace function private.enforce_active_customer_on_order_insert()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.customer_user_id is not null then perform private.assert_customer_account_active(new.customer_user_id); end if;
  return new;
end;
$function$;

drop trigger if exists enforce_active_customer_on_order_insert on public.orders;
create trigger enforce_active_customer_on_order_insert before insert on public.orders
for each row execute function private.enforce_active_customer_on_order_insert();

create or replace function public.create_customer_return_request(p_order_id uuid,p_customer_user_id uuid,p_items jsonb)
returns uuid language plpgsql security definer set search_path to '' as $function$
begin
  perform private.assert_customer_account_active(p_customer_user_id);
  return private.create_return_request_common(p_order_id,'authenticated_customer',p_customer_user_id,null,p_items);
end;$function$;

create or replace function public.create_verified_purchase_review(
  p_order_item_id uuid,p_customer_user_id uuid,p_guest_access_token_hash text,
  p_product_rating smallint,p_artisan_rating smallint,p_review_text text
) returns uuid language plpgsql security definer set search_path to '' as $function$
begin
  if p_customer_user_id is not null then perform private.assert_customer_account_active(p_customer_user_id); end if;
  return private.create_verified_purchase_review(p_order_item_id,p_customer_user_id,p_guest_access_token_hash,p_product_rating,p_artisan_rating,p_review_text);
end;$function$;

create or replace function public.edit_verified_purchase_review(
  p_review_id uuid,p_customer_user_id uuid,p_guest_access_token_hash text,
  p_product_rating smallint,p_artisan_rating smallint,p_review_text text
) returns void language plpgsql security definer set search_path to '' as $function$
begin
  if p_customer_user_id is not null then perform private.assert_customer_account_active(p_customer_user_id); end if;
  perform private.edit_verified_purchase_review(p_review_id,p_customer_user_id,p_guest_access_token_hash,p_product_rating,p_artisan_rating,p_review_text);
end;$function$;

create or replace function public.finalize_review_media(
  p_review_id uuid,p_customer_user_id uuid,p_guest_access_token_hash text,p_storage_path text,p_mime_type text,p_byte_size bigint
) returns uuid language plpgsql security definer set search_path to '' as $function$
declare v_review private.customer_reviews%rowtype; v_count integer; v_next integer; v_id uuid;
begin
  if p_customer_user_id is not null then perform private.assert_customer_account_active(p_customer_user_id); end if;
  v_review := private.require_review_owner(p_review_id,p_customer_user_id,p_guest_access_token_hash);
  perform 1 from private.customer_reviews where id=v_review.id for update;
  if v_review.status <> 'pending_review' then raise exception 'review_media_requires_pending_review'; end if;
  if p_mime_type not in ('image/jpeg','image/png','image/webp') then raise exception 'invalid_review_media_type'; end if;
  if p_byte_size <= 0 or p_byte_size > 5242880 then raise exception 'invalid_review_media_size'; end if;
  if p_storage_path is null or p_storage_path not like v_review.id::text || '/%' then raise exception 'invalid_review_media_path'; end if;
  select count(*),coalesce(max(sort_order),-1)+1 into v_count,v_next from private.review_media where review_id=v_review.id;
  if v_count >= 4 then raise exception 'review_media_limit_reached'; end if;
  insert into private.review_media(review_id,storage_path,mime_type,byte_size,status,sort_order)
  values(v_review.id,p_storage_path,p_mime_type,p_byte_size,'pending_review',v_next) returning id into v_id;
  return v_id;
exception when unique_violation then raise exception 'review_media_already_finalized';
end;$function$;
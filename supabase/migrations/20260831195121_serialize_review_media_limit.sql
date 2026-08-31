create unique index if not exists review_media_review_sort_order_uidx on private.review_media(review_id,sort_order);

create or replace function public.finalize_review_media(p_review_id uuid,p_customer_user_id uuid,p_guest_access_token_hash text,p_storage_path text,p_mime_type text,p_byte_size bigint)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_review private.customer_reviews%rowtype; v_count integer; v_next integer; v_id uuid;
begin
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
end;$$;
revoke all on function public.finalize_review_media(uuid,uuid,text,text,text,bigint) from public,anon,authenticated,service_role;
grant execute on function public.finalize_review_media(uuid,uuid,text,text,text,bigint) to service_role;

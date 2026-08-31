insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('review-media','review-media',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter table private.review_media add column if not exists moderation_note text;
alter table private.review_media add column if not exists reviewed_at timestamptz;

create or replace function private.require_review_owner(p_review_id uuid,p_customer_user_id uuid,p_guest_access_token_hash text)
returns private.customer_reviews
language plpgsql security definer set search_path='' as $$
declare v_review private.customer_reviews%rowtype; v_order public.orders%rowtype;
begin
  select * into v_review from private.customer_reviews where id=p_review_id;
  if not found then raise exception 'review_not_found'; end if;
  select * into v_order from public.orders where id=v_review.order_id;
  if p_customer_user_id is not null then
    if v_order.customer_user_id is distinct from p_customer_user_id then raise exception 'review_access_denied'; end if;
  else
    if p_guest_access_token_hash is null or v_order.guest_access_token_hash is distinct from p_guest_access_token_hash then raise exception 'review_access_denied'; end if;
  end if;
  return v_review;
end;$$;
revoke all on function private.require_review_owner(uuid,uuid,text) from public,anon,authenticated,service_role;

create or replace function public.get_review_media_context(p_review_id uuid,p_customer_user_id uuid,p_guest_access_token_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_review private.customer_reviews%rowtype;
begin
  v_review := private.require_review_owner(p_review_id,p_customer_user_id,p_guest_access_token_hash);
  return jsonb_build_object(
    'reviewId',v_review.id,
    'reviewStatus',v_review.status,
    'media',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'storagePath',m.storage_path,'mimeType',m.mime_type,'byteSize',m.byte_size,'status',m.status,'sortOrder',m.sort_order,'createdAt',m.created_at) order by m.sort_order,m.created_at,m.id) from private.review_media m where m.review_id=v_review.id),'[]'::jsonb)
  );
end;$$;
revoke all on function public.get_review_media_context(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.get_review_media_context(uuid,uuid,text) to service_role;

create or replace function public.finalize_review_media(p_review_id uuid,p_customer_user_id uuid,p_guest_access_token_hash text,p_storage_path text,p_mime_type text,p_byte_size bigint)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_review private.customer_reviews%rowtype; v_count integer; v_next integer; v_id uuid;
begin
  v_review := private.require_review_owner(p_review_id,p_customer_user_id,p_guest_access_token_hash);
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

create or replace function public.review_review_media(p_media_id uuid,p_admin_user_id uuid,p_decision text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.require_super_admin_user(p_admin_user_id);
  if p_decision not in ('approved','rejected','hidden') then raise exception 'invalid_review_media_decision'; end if;
  update private.review_media set status=p_decision,moderation_note=nullif(trim(coalesce(p_note,'')),''),reviewed_at=now()
  where id=p_media_id and status in ('pending_review','approved');
  if not found then raise exception 'invalid_review_media_state'; end if;
end;$$;
revoke all on function public.review_review_media(uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.review_review_media(uuid,uuid,text,text) to service_role;

create or replace function public.get_review_media_for_admin(p_admin_user_id uuid)
returns table(media_id uuid,review_id uuid,storage_path text,mime_type text,byte_size bigint,status text,sort_order integer)
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_super_admin_user(p_admin_user_id);
  return query select m.id,m.review_id,m.storage_path,m.mime_type,m.byte_size,m.status,m.sort_order from private.review_media m where m.status='pending_review' order by m.created_at,m.id;
end;$$;
revoke all on function public.get_review_media_for_admin(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_review_media_for_admin(uuid) to service_role;

create or replace function public.get_published_review_media_paths(p_product_slug text)
returns table(media_id uuid,review_id uuid,storage_path text,mime_type text,sort_order integer)
language sql security definer set search_path='' stable as $$
 select m.id,m.review_id,m.storage_path,m.mime_type,m.sort_order
 from private.review_media m join private.customer_reviews r on r.id=m.review_id
 where r.product_slug_snapshot=p_product_slug and r.status='published' and m.status='approved'
 order by r.created_at desc,m.sort_order,m.id;
$$;
revoke all on function public.get_published_review_media_paths(text) from public,anon,authenticated,service_role;
grant execute on function public.get_published_review_media_paths(text) to service_role;

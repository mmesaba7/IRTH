-- R1 Reviews Foundation — verified delivered purchase, one review per Order Item,
-- one customer edit, IRTH moderation, moderated Artisan reply, private review media metadata.

create table private.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  artisan_id uuid not null references public.artisan_profiles(id),
  customer_user_id uuid references auth.users(id) on delete set null,
  product_slug_snapshot text not null,
  product_name_ar_snapshot text,
  product_name_en_snapshot text not null,
  product_rating smallint not null check (product_rating between 1 and 5),
  artisan_rating smallint not null check (artisan_rating between 1 and 5),
  review_text text not null check (char_length(trim(review_text)) between 1 and 4000),
  status text not null default 'pending_review' check (status in ('pending_review','published','rejected','hidden')),
  edit_count smallint not null default 0 check (edit_count between 0 and 1),
  moderation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (order_item_id)
);

create table private.review_events (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references private.customer_reviews(id) on delete cascade,
  event_type text not null check (event_type in ('submitted','edited','approved','rejected','hidden','artisan_reply_submitted','artisan_reply_approved','artisan_reply_rejected')),
  actor_user_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table private.review_artisan_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique references private.customer_reviews(id) on delete cascade,
  artisan_id uuid not null references public.artisan_profiles(id),
  reply_text text not null check (char_length(trim(reply_text)) between 1 and 3000),
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected','hidden')),
  moderation_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  approved_at timestamptz
);

create table private.review_media (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references private.customer_reviews(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected','hidden')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (review_id, storage_path)
);

create index customer_reviews_product_status_created_idx on private.customer_reviews(product_slug_snapshot,status,created_at desc);
create index customer_reviews_artisan_status_created_idx on private.customer_reviews(artisan_id,status,created_at desc);
create index customer_reviews_customer_created_idx on private.customer_reviews(customer_user_id,created_at desc) where customer_user_id is not null;
create index review_events_review_created_idx on private.review_events(review_id,created_at);
create index review_media_review_status_idx on private.review_media(review_id,status,sort_order);

revoke all on table private.customer_reviews, private.review_events, private.review_artisan_replies, private.review_media from public, anon, authenticated, service_role;

create or replace function private.require_super_admin_user(p_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_user_id is null or not private.is_super_admin_user(p_user_id) then raise exception 'admin_required'; end if;
end;$$;
revoke all on function private.require_super_admin_user(uuid) from public,anon,authenticated,service_role;

create or replace function private.create_verified_purchase_review(p_order_item_id uuid,p_customer_user_id uuid,p_guest_access_token_hash text,p_product_rating smallint,p_artisan_rating smallint,p_review_text text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_item public.order_items%rowtype; v_order public.orders%rowtype; v_review_id uuid; v_delivered boolean;
begin
  if p_product_rating not between 1 and 5 or p_artisan_rating not between 1 and 5 then raise exception 'invalid_rating'; end if;
  if char_length(trim(coalesce(p_review_text,''))) not between 1 and 4000 then raise exception 'invalid_review_text'; end if;
  select * into v_item from public.order_items where id=p_order_item_id;
  if not found then raise exception 'order_item_not_found'; end if;
  select * into v_order from public.orders where id=v_item.order_id;
  if p_customer_user_id is not null then
    if v_order.customer_user_id is distinct from p_customer_user_id then raise exception 'review_access_denied'; end if;
  else
    if p_guest_access_token_hash is null or v_order.guest_access_token_hash is distinct from p_guest_access_token_hash then raise exception 'review_access_denied'; end if;
  end if;
  select exists(select 1 from public.shipments s where s.artisan_group_id=v_item.artisan_group_id and s.delivered_at is not null) into v_delivered;
  if not v_delivered then raise exception 'review_requires_delivery'; end if;
  insert into private.customer_reviews(order_id,order_item_id,product_id,artisan_id,customer_user_id,product_slug_snapshot,product_name_ar_snapshot,product_name_en_snapshot,product_rating,artisan_rating,review_text)
  values(v_item.order_id,v_item.id,v_item.product_id,v_item.artisan_id,p_customer_user_id,v_item.product_slug_snapshot,v_item.product_name_ar_snapshot,v_item.product_name_en_snapshot,p_product_rating,p_artisan_rating,trim(p_review_text)) returning id into v_review_id;
  insert into private.review_events(review_id,event_type,actor_user_id) values(v_review_id,'submitted',p_customer_user_id);
  return v_review_id;
exception when unique_violation then raise exception 'review_already_exists_for_order_item';
end;$$;

create or replace function public.create_verified_purchase_review(p_order_item_id uuid,p_customer_user_id uuid,p_guest_access_token_hash text,p_product_rating smallint,p_artisan_rating smallint,p_review_text text)
returns uuid language sql security definer set search_path='' as $$ select private.create_verified_purchase_review($1,$2,$3,$4,$5,$6); $$;
revoke all on function public.create_verified_purchase_review(uuid,uuid,text,smallint,smallint,text) from public,anon,authenticated,service_role;
grant execute on function public.create_verified_purchase_review(uuid,uuid,text,smallint,smallint,text) to service_role;

create or replace function private.edit_verified_purchase_review(p_review_id uuid,p_customer_user_id uuid,p_guest_access_token_hash text,p_product_rating smallint,p_artisan_rating smallint,p_review_text text)
returns void language plpgsql security definer set search_path='' as $$
declare v_review private.customer_reviews%rowtype; v_order public.orders%rowtype;
begin
  select * into v_review from private.customer_reviews where id=p_review_id for update;
  if not found then raise exception 'review_not_found'; end if;
  select * into v_order from public.orders where id=v_review.order_id;
  if p_customer_user_id is not null then
    if v_order.customer_user_id is distinct from p_customer_user_id then raise exception 'review_access_denied'; end if;
  else
    if p_guest_access_token_hash is null or v_order.guest_access_token_hash is distinct from p_guest_access_token_hash then raise exception 'review_access_denied'; end if;
  end if;
  if v_review.edit_count >= 1 then raise exception 'review_edit_limit_reached'; end if;
  if p_product_rating not between 1 and 5 or p_artisan_rating not between 1 and 5 or char_length(trim(coalesce(p_review_text,''))) not between 1 and 4000 then raise exception 'invalid_review'; end if;
  update private.customer_reviews set product_rating=p_product_rating,artisan_rating=p_artisan_rating,review_text=trim(p_review_text),edit_count=1,status='pending_review',moderation_note=null,published_at=null,updated_at=now() where id=p_review_id;
  update private.review_media set status='pending_review' where review_id=p_review_id and status='approved';
  update private.review_artisan_replies set status='hidden' where review_id=p_review_id and status='approved';
  insert into private.review_events(review_id,event_type,actor_user_id) values(p_review_id,'edited',p_customer_user_id);
end;$$;
create or replace function public.edit_verified_purchase_review(p_review_id uuid,p_customer_user_id uuid,p_guest_access_token_hash text,p_product_rating smallint,p_artisan_rating smallint,p_review_text text)
returns void language sql security definer set search_path='' as $$ select private.edit_verified_purchase_review($1,$2,$3,$4,$5,$6); $$;
revoke all on function public.edit_verified_purchase_review(uuid,uuid,text,smallint,smallint,text) from public,anon,authenticated,service_role;
grant execute on function public.edit_verified_purchase_review(uuid,uuid,text,smallint,smallint,text) to service_role;

create or replace function private.review_customer_review(p_review_id uuid,p_admin_user_id uuid,p_decision text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.require_super_admin_user(p_admin_user_id);
  if p_decision not in ('approved','rejected','hidden') then raise exception 'invalid_review_decision'; end if;
  update private.customer_reviews set status=case p_decision when 'approved' then 'published' else p_decision end,moderation_note=nullif(trim(coalesce(p_note,'')),''),published_at=case when p_decision='approved' then coalesce(published_at,now()) else published_at end,updated_at=now() where id=p_review_id and status in ('pending_review','published');
  if not found then raise exception 'invalid_review_state'; end if;
  if p_decision<>'approved' then update private.review_media set status=case when p_decision='hidden' then 'hidden' else 'rejected' end where review_id=p_review_id; end if;
  insert into private.review_events(review_id,event_type,actor_user_id,note) values(p_review_id,case p_decision when 'approved' then 'approved' when 'rejected' then 'rejected' else 'hidden' end,p_admin_user_id,nullif(trim(coalesce(p_note,'')),''));
end;$$;
create or replace function public.review_customer_review(p_review_id uuid,p_admin_user_id uuid,p_decision text,p_note text)
returns void language sql security definer set search_path='' as $$ select private.review_customer_review($1,$2,$3,$4); $$;
revoke all on function public.review_customer_review(uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.review_customer_review(uuid,uuid,text,text) to service_role;

create or replace function private.submit_artisan_review_reply(p_review_id uuid,p_artisan_id uuid,p_artisan_user_id uuid,p_reply_text text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  perform private.require_artisan_payout_requester(p_artisan_id,p_artisan_user_id);
  if not exists(select 1 from private.customer_reviews r where r.id=p_review_id and r.artisan_id=p_artisan_id and r.status='published') then raise exception 'review_reply_not_allowed'; end if;
  if char_length(trim(coalesce(p_reply_text,''))) not between 1 and 3000 then raise exception 'invalid_reply_text'; end if;
  insert into private.review_artisan_replies(review_id,artisan_id,reply_text) values(p_review_id,p_artisan_id,trim(p_reply_text)) returning id into v_id;
  insert into private.review_events(review_id,event_type,actor_user_id) values(p_review_id,'artisan_reply_submitted',p_artisan_user_id);
  return v_id;
exception when unique_violation then raise exception 'artisan_reply_already_exists';
end;$$;
create or replace function public.submit_artisan_review_reply(p_review_id uuid,p_artisan_id uuid,p_artisan_user_id uuid,p_reply_text text)
returns uuid language sql security definer set search_path='' as $$ select private.submit_artisan_review_reply($1,$2,$3,$4); $$;
revoke all on function public.submit_artisan_review_reply(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.submit_artisan_review_reply(uuid,uuid,uuid,text) to service_role;

create or replace function private.review_artisan_reply(p_reply_id uuid,p_admin_user_id uuid,p_decision text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare v_review_id uuid;
begin
  perform private.require_super_admin_user(p_admin_user_id);
  if p_decision not in ('approved','rejected','hidden') then raise exception 'invalid_reply_decision'; end if;
  update private.review_artisan_replies set status=p_decision,moderation_note=nullif(trim(coalesce(p_note,'')),''),reviewed_at=now(),approved_at=case when p_decision='approved' then now() else approved_at end where id=p_reply_id and status in ('pending_review','approved') returning review_id into v_review_id;
  if not found then raise exception 'invalid_reply_state'; end if;
  insert into private.review_events(review_id,event_type,actor_user_id,note) values(v_review_id,case p_decision when 'approved' then 'artisan_reply_approved' when 'rejected' then 'artisan_reply_rejected' else 'artisan_reply_rejected' end,p_admin_user_id,nullif(trim(coalesce(p_note,'')),''));
end;$$;
create or replace function public.review_artisan_reply(p_reply_id uuid,p_admin_user_id uuid,p_decision text,p_note text)
returns void language sql security definer set search_path='' as $$ select private.review_artisan_reply($1,$2,$3,$4); $$;
revoke all on function public.review_artisan_reply(uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.review_artisan_reply(uuid,uuid,text,text) to service_role;

create or replace function public.get_published_product_reviews(p_product_slug text)
returns table(review_id uuid,product_rating smallint,artisan_rating smallint,review_text text,created_at timestamptz,edited boolean,reply_text text,reply_created_at timestamptz)
language sql security definer set search_path='' stable as $$
 select r.id,r.product_rating,r.artisan_rating,r.review_text,r.created_at,(r.edit_count=1),ar.reply_text,ar.created_at
 from private.customer_reviews r left join private.review_artisan_replies ar on ar.review_id=r.id and ar.status='approved'
 where r.product_slug_snapshot=p_product_slug and r.status='published'
 order by r.created_at desc;
$$;
revoke all on function public.get_published_product_reviews(text) from public,anon,authenticated,service_role;
grant execute on function public.get_published_product_reviews(text) to anon,authenticated,service_role;

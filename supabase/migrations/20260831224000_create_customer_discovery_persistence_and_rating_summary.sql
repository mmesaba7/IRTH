create table if not exists private.customer_saved_products (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists customer_saved_products_product_idx
  on private.customer_saved_products(product_id);

create table if not exists private.customer_recently_viewed_products (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists customer_recently_viewed_user_viewed_idx
  on private.customer_recently_viewed_products(user_id, viewed_at desc);
create index if not exists customer_recently_viewed_product_idx
  on private.customer_recently_viewed_products(product_id);

revoke all on table private.customer_saved_products, private.customer_recently_viewed_products
  from public, anon, authenticated, service_role;

create or replace function public.get_customer_saved_product_slugs(p_user_id uuid)
returns table(slug text)
language sql security definer set search_path='' stable as $$
  select p.slug
  from private.customer_saved_products s
  join public.products p on p.id=s.product_id
  join public.artisan_profiles a on a.id=p.artisan_id
  where s.user_id=p_user_id
    and p.lifecycle_status='published'
    and a.status='active'
  order by s.created_at desc;
$$;
revoke all on function public.get_customer_saved_product_slugs(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_customer_saved_product_slugs(uuid) to service_role;

create or replace function public.set_customer_saved_product(
  p_user_id uuid,
  p_product_slug text,
  p_saved boolean
)
returns void
language plpgsql security definer set search_path='' as $$
declare
  v_product_id uuid;
  v_lifecycle text;
  v_artisan_status text;
begin
  if p_user_id is null then raise exception 'customer_required'; end if;
  select p.id,p.lifecycle_status,a.status
    into v_product_id,v_lifecycle,v_artisan_status
  from public.products p
  join public.artisan_profiles a on a.id=p.artisan_id
  where p.slug=trim(coalesce(p_product_slug,''));
  if not found then raise exception 'product_not_found'; end if;

  if p_saved then
    if v_lifecycle<>'published' or v_artisan_status<>'active' then raise exception 'product_unavailable'; end if;
    insert into private.customer_saved_products(user_id,product_id)
    values(p_user_id,v_product_id)
    on conflict (user_id,product_id) do nothing;
  else
    delete from private.customer_saved_products
    where user_id=p_user_id and product_id=v_product_id;
  end if;
end;$$;
revoke all on function public.set_customer_saved_product(uuid,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.set_customer_saved_product(uuid,text,boolean) to service_role;

create or replace function public.merge_customer_saved_products(
  p_user_id uuid,
  p_product_slugs text[]
)
returns integer
language plpgsql security definer set search_path='' as $$
declare v_inserted integer;
begin
  if p_user_id is null then raise exception 'customer_required'; end if;
  insert into private.customer_saved_products(user_id,product_id)
  select distinct p_user_id,p.id
  from public.products p
  join public.artisan_profiles a on a.id=p.artisan_id
  where p.slug=any(coalesce(p_product_slugs,array[]::text[]))
    and p.lifecycle_status='published'
    and a.status='active'
  on conflict (user_id,product_id) do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted;
end;$$;
revoke all on function public.merge_customer_saved_products(uuid,text[]) from public,anon,authenticated,service_role;
grant execute on function public.merge_customer_saved_products(uuid,text[]) to service_role;

create or replace function public.get_customer_recently_viewed_product_slugs(p_user_id uuid)
returns table(slug text, viewed_at timestamptz)
language sql security definer set search_path='' stable as $$
  select p.slug,r.viewed_at
  from private.customer_recently_viewed_products r
  join public.products p on p.id=r.product_id
  join public.artisan_profiles a on a.id=p.artisan_id
  where r.user_id=p_user_id
    and p.lifecycle_status='published'
    and a.status='active'
  order by r.viewed_at desc
  limit 20;
$$;
revoke all on function public.get_customer_recently_viewed_product_slugs(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_customer_recently_viewed_product_slugs(uuid) to service_role;

create or replace function public.record_customer_recently_viewed_product(
  p_user_id uuid,
  p_product_slug text
)
returns void
language plpgsql security definer set search_path='' as $$
declare v_product_id uuid;
begin
  if p_user_id is null then raise exception 'customer_required'; end if;
  select p.id into v_product_id
  from public.products p
  join public.artisan_profiles a on a.id=p.artisan_id
  where p.slug=trim(coalesce(p_product_slug,''))
    and p.lifecycle_status='published'
    and a.status='active';
  if not found then raise exception 'product_unavailable'; end if;

  insert into private.customer_recently_viewed_products(user_id,product_id,viewed_at)
  values(p_user_id,v_product_id,now())
  on conflict (user_id,product_id)
  do update set viewed_at=excluded.viewed_at;
end;$$;
revoke all on function public.record_customer_recently_viewed_product(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.record_customer_recently_viewed_product(uuid,text) to service_role;

create or replace function public.get_public_artisan_rating_summary()
returns table(artisan_id uuid, average_rating numeric, review_count bigint)
language sql security definer set search_path='' stable as $$
  select r.artisan_id, round(avg(r.artisan_rating)::numeric,2), count(*)::bigint
  from private.customer_reviews r
  join public.artisan_profiles a on a.id=r.artisan_id
  where r.status='published' and a.status='active'
  group by r.artisan_id;
$$;
revoke all on function public.get_public_artisan_rating_summary() from public,anon,authenticated,service_role;
grant execute on function public.get_public_artisan_rating_summary() to anon,authenticated,service_role;

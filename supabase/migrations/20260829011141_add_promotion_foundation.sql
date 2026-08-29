create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('irth', 'artisan')),
  artisan_id uuid null references public.artisan_profiles(id) on delete restrict,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  funding_source text not null check (funding_source in ('irth', 'artisan')),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  is_enabled boolean not null default true,
  start_at timestamptz not null,
  end_at timestamptz not null,
  admin_note text null,
  created_by uuid null references auth.users(id) on delete set null,
  reviewed_by uuid null references auth.users(id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_valid_period check (end_at > start_at),
  constraint promotions_percentage_value check (discount_type <> 'percentage' or discount_value <= 100),
  constraint promotions_source_integrity check (
    (source_type = 'artisan' and funding_source = 'artisan' and artisan_id is not null)
    or
    (source_type = 'irth' and funding_source = 'irth' and artisan_id is null)
  )
);

create table public.promotion_products (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (promotion_id, product_id)
);

create index promotions_artisan_id_idx on public.promotions(artisan_id);
create index promotions_public_window_idx on public.promotions(approval_status, is_enabled, start_at, end_at);
create index promotion_products_product_id_idx on public.promotion_products(product_id);

alter table public.promotions enable row level security;
alter table public.promotion_products enable row level security;

revoke all on public.promotions from anon, authenticated;
revoke all on public.promotion_products from anon, authenticated;
grant select, update on public.promotions to authenticated;
grant select on public.promotion_products to authenticated;

create policy "Artisans can read own promotions"
on public.promotions
for select
to authenticated
using (
  source_type = 'artisan'
  and exists (
    select 1
    from public.artisan_profiles ap
    where ap.id = promotions.artisan_id
      and ap.auth_user_id = (select auth.uid())
  )
);

create policy "Super admin can read promotions"
on public.promotions
for select
to authenticated
using ((select private.is_super_admin()));

create policy "Super admin can update promotions"
on public.promotions
for update
to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));

create policy "Artisans can read own promotion products"
on public.promotion_products
for select
to authenticated
using (
  exists (
    select 1
    from public.promotions pr
    join public.artisan_profiles ap on ap.id = pr.artisan_id
    where pr.id = promotion_products.promotion_id
      and pr.source_type = 'artisan'
      and ap.auth_user_id = (select auth.uid())
  )
);

create policy "Super admin can read promotion products"
on public.promotion_products
for select
to authenticated
using ((select private.is_super_admin()));

create or replace function public.submit_artisan_promotion(
  p_discount_type text,
  p_discount_value numeric,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_product_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_artisan_id uuid;
  v_promotion_id uuid;
  v_requested_count integer;
  v_owned_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select ap.id
  into v_artisan_id
  from public.artisan_profiles ap
  where ap.auth_user_id = v_user_id
    and ap.status = 'active'
  limit 1;

  if v_artisan_id is null then
    raise exception 'Active artisan profile required';
  end if;

  if p_discount_type not in ('percentage', 'fixed') then
    raise exception 'Invalid discount type';
  end if;

  if p_discount_value is null or p_discount_value <= 0 then
    raise exception 'Discount value must be positive';
  end if;

  if p_discount_type = 'percentage' and p_discount_value > 100 then
    raise exception 'Percentage discount cannot exceed 100';
  end if;

  if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then
    raise exception 'Invalid promotion period';
  end if;

  select count(*)
  into v_requested_count
  from (select distinct unnest(coalesce(p_product_ids, array[]::uuid[])) as product_id) x;

  if v_requested_count = 0 then
    raise exception 'At least one product is required';
  end if;

  select count(distinct p.id)
  into v_owned_count
  from public.products p
  where p.id = any(p_product_ids)
    and p.artisan_id = v_artisan_id;

  if v_owned_count <> v_requested_count then
    raise exception 'Promotion products must belong to the artisan';
  end if;

  insert into public.promotions (
    source_type,
    artisan_id,
    discount_type,
    discount_value,
    funding_source,
    approval_status,
    is_enabled,
    start_at,
    end_at,
    created_by
  )
  values (
    'artisan',
    v_artisan_id,
    p_discount_type,
    p_discount_value,
    'artisan',
    'pending',
    true,
    p_start_at,
    p_end_at,
    v_user_id
  )
  returning id into v_promotion_id;

  insert into public.promotion_products (promotion_id, product_id)
  select v_promotion_id, x.product_id
  from (select distinct unnest(p_product_ids) as product_id) x;

  return v_promotion_id;
end;
$$;

create or replace function public.create_irth_promotion(
  p_discount_type text,
  p_discount_value numeric,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_product_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_promotion_id uuid;
  v_requested_count integer;
  v_existing_count integer;
begin
  if v_user_id is null or not private.is_super_admin() then
    raise exception 'Super admin required';
  end if;

  if p_discount_type not in ('percentage', 'fixed') then
    raise exception 'Invalid discount type';
  end if;

  if p_discount_value is null or p_discount_value <= 0 then
    raise exception 'Discount value must be positive';
  end if;

  if p_discount_type = 'percentage' and p_discount_value > 100 then
    raise exception 'Percentage discount cannot exceed 100';
  end if;

  if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then
    raise exception 'Invalid promotion period';
  end if;

  select count(*)
  into v_requested_count
  from (select distinct unnest(coalesce(p_product_ids, array[]::uuid[])) as product_id) x;

  if v_requested_count = 0 then
    raise exception 'At least one product is required';
  end if;

  select count(distinct p.id)
  into v_existing_count
  from public.products p
  where p.id = any(p_product_ids);

  if v_existing_count <> v_requested_count then
    raise exception 'One or more products do not exist';
  end if;

  insert into public.promotions (
    source_type,
    artisan_id,
    discount_type,
    discount_value,
    funding_source,
    approval_status,
    is_enabled,
    start_at,
    end_at,
    created_by,
    reviewed_by,
    reviewed_at
  )
  values (
    'irth',
    null,
    p_discount_type,
    p_discount_value,
    'irth',
    'approved',
    true,
    p_start_at,
    p_end_at,
    v_user_id,
    v_user_id,
    now()
  )
  returning id into v_promotion_id;

  insert into public.promotion_products (promotion_id, product_id)
  select v_promotion_id, x.product_id
  from (select distinct unnest(p_product_ids) as product_id) x;

  return v_promotion_id;
end;
$$;

create or replace function public.review_artisan_promotion(
  p_promotion_id uuid,
  p_decision text,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not private.is_super_admin() then
    raise exception 'Super admin required';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid review decision';
  end if;

  if p_decision = 'rejected' and nullif(btrim(coalesce(p_admin_note, '')), '') is null then
    raise exception 'Admin note is required for rejection';
  end if;

  update public.promotions
  set approval_status = p_decision,
      is_enabled = case when p_decision = 'approved' then true else false end,
      admin_note = case when p_decision = 'approved' then null else btrim(p_admin_note) end,
      reviewed_by = v_user_id,
      reviewed_at = now(),
      updated_at = now()
  where id = p_promotion_id
    and source_type = 'artisan'
    and approval_status = 'pending';

  if not found then
    raise exception 'Pending artisan promotion not found';
  end if;
end;
$$;

create or replace function public.set_promotion_enabled(
  p_promotion_id uuid,
  p_is_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_super_admin() then
    raise exception 'Super admin required';
  end if;

  update public.promotions
  set is_enabled = p_is_enabled,
      updated_at = now()
  where id = p_promotion_id
    and approval_status = 'approved';

  if not found then
    raise exception 'Approved promotion not found';
  end if;
end;
$$;

create or replace function public.get_active_promotions()
returns table (
  promotion_id uuid,
  source_type text,
  discount_type text,
  discount_value numeric,
  start_at timestamptz,
  end_at timestamptz,
  product_id uuid,
  product_slug text,
  product_name_ar text,
  product_name_en text,
  product_price numeric,
  artisan_slug text,
  artisan_name_ar text,
  artisan_name_en text,
  craft_name_ar text,
  craft_name_en text,
  country_name_ar text,
  country_name_en text
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    pr.id,
    pr.source_type,
    pr.discount_type,
    pr.discount_value,
    pr.start_at,
    pr.end_at,
    p.id,
    p.slug,
    p.name_ar,
    p.name_en,
    p.price,
    ap.slug,
    ap.name_ar,
    ap.name_en,
    c.name_ar,
    c.name_en,
    co.name_ar,
    co.name_en
  from public.promotions pr
  join public.promotion_products pp on pp.promotion_id = pr.id
  join public.products p on p.id = pp.product_id
  join public.artisan_profiles ap on ap.id = p.artisan_id
  join public.crafts c on c.id = p.primary_craft_id
  join public.countries co on co.id = ap.country_id
  where pr.approval_status = 'approved'
    and pr.is_enabled = true
    and now() >= pr.start_at
    and now() < pr.end_at
    and p.lifecycle_status = 'published'
    and ap.status = 'active'
    and c.is_active = true
    and co.is_active = true;
$$;

revoke execute on function public.submit_artisan_promotion(text, numeric, timestamptz, timestamptz, uuid[]) from public, anon;
grant execute on function public.submit_artisan_promotion(text, numeric, timestamptz, timestamptz, uuid[]) to authenticated;

revoke execute on function public.create_irth_promotion(text, numeric, timestamptz, timestamptz, uuid[]) from public, anon;
grant execute on function public.create_irth_promotion(text, numeric, timestamptz, timestamptz, uuid[]) to authenticated;

revoke execute on function public.review_artisan_promotion(uuid, text, text) from public, anon;
grant execute on function public.review_artisan_promotion(uuid, text, text) to authenticated;

revoke execute on function public.set_promotion_enabled(uuid, boolean) from public, anon;
grant execute on function public.set_promotion_enabled(uuid, boolean) to authenticated;

revoke execute on function public.get_active_promotions() from public;
grant execute on function public.get_active_promotions() to anon, authenticated;;

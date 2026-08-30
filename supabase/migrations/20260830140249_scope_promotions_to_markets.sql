-- S15.4.1 — Promotion Market Scope
--
-- Prepare Promotions for market-aware commerce.
--
-- Important:
-- Existing Promotions are NOT automatically assigned to Egypt
-- or to any other Market.
--
-- They remain unscoped until explicitly migrated/reviewed.

alter table public.promotions
  add column market_id uuid null
    references public.markets(id)
    on delete restrict;

-- Promotion money must not be globally restricted to 2 decimal places.
-- Currency-specific rounding belongs to the commerce calculation layer.

alter table public.promotions
  alter column discount_value type numeric;

create index promotions_market_id_idx
  on public.promotions(market_id);

create index promotions_market_active_window_idx
  on public.promotions(
    market_id,
    approval_status,
    is_enabled,
    start_at,
    end_at
  );

-- Replace the old market-agnostic Promotion RPCs before this migration
-- reaches any shared/remote database.
--
-- Public functions remain thin SECURITY INVOKER wrappers.
-- Sensitive validation/inserts remain in the private schema.

-- Drop public wrappers first because they depend on the private functions.
drop function if exists public.submit_artisan_promotion(
  text,
  numeric,
  timestamptz,
  timestamptz,
  uuid[]
);

drop function if exists public.create_irth_promotion(
  text,
  numeric,
  timestamptz,
  timestamptz,
  uuid[]
);

drop function if exists public.get_active_promotions();

-- Remove the old private implementations so callers cannot keep creating
-- promotions without an explicit Market.
drop function if exists private.submit_artisan_promotion(
  text,
  numeric,
  timestamptz,
  timestamptz,
  uuid[]
);

drop function if exists private.create_irth_promotion(
  text,
  numeric,
  timestamptz,
  timestamptz,
  uuid[]
);

drop function if exists private.get_active_promotions();

create function private.submit_artisan_promotion(
  p_market_id uuid,
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

  if p_market_id is null
    or not exists (
      select 1
      from public.markets m
      where m.id = p_market_id
    ) then
    raise exception 'Valid market is required';
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
  from (
    select distinct unnest(coalesce(p_product_ids, array[]::uuid[])) as product_id
  ) x;

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
    market_id,
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
    p_market_id,
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
  from (
    select distinct unnest(p_product_ids) as product_id
  ) x;

  return v_promotion_id;
end;
$$;

create function private.create_irth_promotion(
  p_market_id uuid,
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

  if p_market_id is null
    or not exists (
      select 1
      from public.markets m
      where m.id = p_market_id
    ) then
    raise exception 'Valid market is required';
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
  from (
    select distinct unnest(coalesce(p_product_ids, array[]::uuid[])) as product_id
  ) x;

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
    market_id,
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
    p_market_id,
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
  from (
    select distinct unnest(p_product_ids) as product_id
  ) x;

  return v_promotion_id;
end;
$$;

create function private.get_active_promotions(
  p_market_id uuid
)
returns table (
  promotion_id uuid,
  market_id uuid,
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
    pr.market_id,
    pr.source_type,
    pr.discount_type,
    pr.discount_value,
    pr.start_at,
    pr.end_at,
    p.id,
    p.slug,
    p.name_ar,
    p.name_en,
    pmp.price,
    ap.slug,
    ap.name_ar,
    ap.name_en,
    c.name_ar,
    c.name_en,
    co.name_ar,
    co.name_en
  from public.promotions pr
  join public.markets m
    on m.id = pr.market_id
   and m.is_active = true
  join public.promotion_products pp
    on pp.promotion_id = pr.id
  join public.products p
    on p.id = pp.product_id
  join public.product_market_prices pmp
    on pmp.product_id = p.id
   and pmp.market_id = pr.market_id
   and pmp.is_active = true
  join public.artisan_profiles ap
    on ap.id = p.artisan_id
  join public.crafts c
    on c.id = p.primary_craft_id
  join public.countries co
    on co.id = ap.country_id
  where pr.market_id = p_market_id
    and pr.approval_status = 'approved'
    and pr.is_enabled = true
    and now() >= pr.start_at
    and now() < pr.end_at
    and p.lifecycle_status = 'published'
    and ap.status = 'active'
    and c.is_active = true
    and co.is_active = true;
$$;

-- Private implementations are callable only by the roles that need them.
revoke execute on function private.submit_artisan_promotion(
  uuid,
  text,
  numeric,
  timestamptz,
  timestamptz,
  uuid[]
) from public, anon;
grant execute on function private.submit_artisan_promotion(
  uuid,
  text,
  numeric,
  timestamptz,
  timestamptz,
  uuid[]
) to authenticated;

revoke execute on function private.create_irth_promotion(
  uuid,
  text,
  numeric,
  timestamptz,
  timestamptz,
  uuid[]
) from public, anon;
grant execute on function private.create_irth_promotion(
  uuid,
  text,
  numeric,
  timestamptz,
  timestamptz,
  uuid[]
) to authenticated;

revoke execute on function private.get_active_promotions(uuid) from public;
grant execute on function private.get_active_promotions(uuid) to anon, authenticated;

-- Public Data API wrappers stay SECURITY INVOKER and contain no business logic.
create function public.submit_artisan_promotion(
  p_market_id uuid,
  p_discount_type text,
  p_discount_value numeric,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_product_ids uuid[]
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.submit_artisan_promotion(
    p_market_id,
    p_discount_type,
    p_discount_value,
    p_start_at,
    p_end_at,
    p_product_ids
  );
$$;

create function public.create_irth_promotion(
  p_market_id uuid,
  p_discount_type text,
  p_discount_value numeric,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_product_ids uuid[]
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_irth_promotion(
    p_market_id,
    p_discount_type,
    p_discount_value,
    p_start_at,
    p_end_at,
    p_product_ids
  );
$$;

create function public.get_active_promotions(
  p_market_id uuid
)
returns table (
  promotion_id uuid,
  market_id uuid,
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
security invoker
stable
set search_path = ''
as $$
  select *
  from private.get_active_promotions(p_market_id);
$$;

revoke execute on function public.submit_artisan_promotion(
  uuid,
  text,
  numeric,
  timestamptz,
  timestamptz,
  uuid[]
) from public, anon;
grant execute on function public.submit_artisan_promotion(
  uuid,
  text,
  numeric,
  timestamptz,
  timestamptz,
  uuid[]
) to authenticated;

revoke execute on function public.create_irth_promotion(
  uuid,
  text,
  numeric,
  timestamptz,
  timestamptz,
  uuid[]
) from public, anon;
grant execute on function public.create_irth_promotion(
  uuid,
  text,
  numeric,
  timestamptz,
  timestamptz,
  uuid[]
) to authenticated;

revoke execute on function public.get_active_promotions(uuid) from public;
grant execute on function public.get_active_promotions(uuid) to anon, authenticated;

-- S15.4.4 — Secure Coupon Lookup Boundary
--
-- Goals:
-- 1. Do not expose general Coupon table reads to anon/authenticated clients.
-- 2. Resolve exactly one Market-scoped active Coupon by normalized code.
-- 3. Return money values as text so JavaScript never receives PostgreSQL numeric
--    through an implicit floating-point conversion before commerce arithmetic.
-- 4. Resolve Product/Craft restriction OR/union and Artisan-funded scope inside
--    the trusted database boundary for the Product IDs already present in the quote.
-- 5. Do not consume Coupon usage here.
-- 6. Per-customer usage enforcement remains a Checkout/Identity concern (15A).

create function private.get_applicable_coupon(
  p_market_id uuid,
  p_code text,
  p_product_ids uuid[]
)
returns table (
  coupon_id uuid,
  market_id uuid,
  code text,
  discount_type text,
  discount_value text,
  minimum_order_amount text,
  max_discount_amount text,
  stackable boolean,
  funding_source text,
  artisan_id uuid,
  start_at timestamptz,
  end_at timestamptz,
  total_usage_limit integer,
  per_customer_usage_limit integer,
  total_redemptions bigint,
  eligible_product_ids uuid[]
)
language sql
security definer
stable
set search_path = ''
as $$
  with candidate as (
    select
      c.id,
      c.market_id,
      c.code,
      c.discount_type,
      c.discount_value,
      c.minimum_order_amount,
      c.max_discount_amount,
      c.stackable,
      c.funding_source,
      c.artisan_id,
      c.start_at,
      c.end_at,
      c.total_usage_limit,
      c.per_customer_usage_limit,
      (
        select count(*)
        from public.coupon_redemptions cr
        where cr.coupon_id = c.id
      )::bigint as total_redemptions,
      exists (
        select 1
        from public.coupon_products cp
        where cp.coupon_id = c.id
      ) as has_product_restrictions,
      exists (
        select 1
        from public.coupon_crafts cc
        where cc.coupon_id = c.id
      ) as has_craft_restrictions
    from public.coupons c
    join public.markets m
      on m.id = c.market_id
     and m.is_active = true
    where c.market_id = p_market_id
      and p_code is not null
      and length(btrim(p_code)) > 0
      and lower(c.code) = lower(btrim(p_code))
      and c.is_enabled = true
      and now() >= c.start_at
      and now() < c.end_at
    limit 1
  ),
  eligible as (
    select
      c.id as coupon_id,
      coalesce(
        array_agg(distinct p.id order by p.id)
          filter (where p.id is not null),
        array[]::uuid[]
      ) as eligible_product_ids
    from candidate c
    left join public.products p
      on p.id = any(coalesce(p_product_ids, array[]::uuid[]))
     and (
       c.funding_source <> 'artisan'
       or p.artisan_id = c.artisan_id
     )
     and (
       (
         c.has_product_restrictions = false
         and c.has_craft_restrictions = false
       )
       or exists (
         select 1
         from public.coupon_products cp
         where cp.coupon_id = c.id
           and cp.product_id = p.id
       )
       or exists (
         select 1
         from public.coupon_crafts cc
         where cc.coupon_id = c.id
           and cc.craft_id = p.primary_craft_id
       )
     )
    group by c.id
  )
  select
    c.id,
    c.market_id,
    c.code,
    c.discount_type,
    c.discount_value::text,
    c.minimum_order_amount::text,
    c.max_discount_amount::text,
    c.stackable,
    c.funding_source,
    c.artisan_id,
    c.start_at,
    c.end_at,
    c.total_usage_limit,
    c.per_customer_usage_limit,
    c.total_redemptions,
    coalesce(e.eligible_product_ids, array[]::uuid[])
  from candidate c
  left join eligible e
    on e.coupon_id = c.id
  where c.total_usage_limit is null
     or c.total_redemptions < c.total_usage_limit;
$$;

-- The private implementation needs privileged reads because Coupon tables are
-- intentionally not directly readable by shoppers. Keep it outside public.
revoke execute on function private.get_applicable_coupon(uuid, text, uuid[])
  from public;

grant usage on schema private
  to anon, authenticated;

grant execute on function private.get_applicable_coupon(uuid, text, uuid[])
  to anon, authenticated;

-- Thin Data API wrapper. It contains no privileged business logic itself.
create function public.get_applicable_coupon(
  p_market_id uuid,
  p_code text,
  p_product_ids uuid[]
)
returns table (
  coupon_id uuid,
  market_id uuid,
  code text,
  discount_type text,
  discount_value text,
  minimum_order_amount text,
  max_discount_amount text,
  stackable boolean,
  funding_source text,
  artisan_id uuid,
  start_at timestamptz,
  end_at timestamptz,
  total_usage_limit integer,
  per_customer_usage_limit integer,
  total_redemptions bigint,
  eligible_product_ids uuid[]
)
language sql
security invoker
stable
set search_path = ''
as $$
  select *
  from private.get_applicable_coupon(
    p_market_id,
    p_code,
    p_product_ids
  );
$$;

revoke execute on function public.get_applicable_coupon(uuid, text, uuid[])
  from public;

grant execute on function public.get_applicable_coupon(uuid, text, uuid[])
  to anon, authenticated;

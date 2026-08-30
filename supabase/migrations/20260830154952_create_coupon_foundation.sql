-- S15.4.3 — Coupon DB Foundation
--
-- Scope:
-- 1. Coupons are market-scoped.
-- 2. Coupon codes are unique per market, case-insensitive and trim-insensitive.
-- 3. Product and craft restrictions are stored separately and combine as OR/union later.
-- 4. Redemption rows are an audit ledger. No order_id exists yet because the real Orders
--    foundation has not been built. It must be added before the first real coupon consumption.
-- 5. No coupon calculation or consumption function is introduced in this migration.

create table public.coupons (
  id uuid primary key default gen_random_uuid(),

  market_id uuid not null
    references public.markets(id)
    on delete restrict,

  code text not null,

  discount_type text not null,
  discount_value numeric not null,

  minimum_order_amount numeric,
  max_discount_amount numeric,

  total_usage_limit integer,
  per_customer_usage_limit integer,

  stackable boolean not null,

  funding_source text not null,
  artisan_id uuid
    references public.artisan_profiles(id)
    on delete restrict,

  start_at timestamptz not null,
  end_at timestamptz not null,
  is_enabled boolean not null default false,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint coupons_code_not_blank
    check (length(btrim(code)) > 0),

  constraint coupons_code_is_trimmed
    check (code = btrim(code)),

  constraint coupons_discount_type_check
    check (discount_type in ('percentage', 'fixed')),

  constraint coupons_discount_value_positive
    check (discount_value > 0),

  constraint coupons_percentage_value
    check (
      discount_type <> 'percentage'
      or discount_value <= 100
    ),

  constraint coupons_minimum_order_positive
    check (
      minimum_order_amount is null
      or minimum_order_amount > 0
    ),

  constraint coupons_max_discount_positive
    check (
      max_discount_amount is null
      or max_discount_amount > 0
    ),

  constraint coupons_max_discount_percentage_only
    check (
      discount_type = 'percentage'
      or max_discount_amount is null
    ),

  constraint coupons_total_usage_limit_positive
    check (
      total_usage_limit is null
      or total_usage_limit > 0
    ),

  constraint coupons_per_customer_usage_limit_positive
    check (
      per_customer_usage_limit is null
      or per_customer_usage_limit > 0
    ),

  constraint coupons_funding_source_check
    check (funding_source in ('irth', 'artisan')),

  constraint coupons_funding_integrity
    check (
      (funding_source = 'artisan' and artisan_id is not null)
      or
      (funding_source = 'irth' and artisan_id is null)
    ),

  constraint coupons_valid_period
    check (end_at > start_at)
);


create table public.coupon_products (
  coupon_id uuid not null
    references public.coupons(id)
    on delete cascade,

  product_id uuid not null
    references public.products(id)
    on delete restrict,

  primary key (coupon_id, product_id)
);


create table public.coupon_crafts (
  coupon_id uuid not null
    references public.coupons(id)
    on delete cascade,

  craft_id uuid not null
    references public.crafts(id)
    on delete restrict,

  primary key (coupon_id, craft_id)
);


create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),

  coupon_id uuid not null
    references public.coupons(id)
    on delete restrict,

  customer_user_id uuid
    references auth.users(id)
    on delete set null,

  consumed_at timestamptz not null default now()
);


-- One normalized code per market. The stored code must already be trimmed;
-- lower(...) makes uniqueness case-insensitive.
create unique index coupons_market_normalized_code_uidx
  on public.coupons(market_id, lower(code));

create index coupons_market_id_idx
  on public.coupons(market_id);

create index coupons_artisan_id_idx
  on public.coupons(artisan_id)
  where artisan_id is not null;

create index coupons_active_window_idx
  on public.coupons(market_id, is_enabled, start_at, end_at);

create index coupon_products_product_id_idx
  on public.coupon_products(product_id);

create index coupon_crafts_craft_id_idx
  on public.coupon_crafts(craft_id);

create index coupon_redemptions_coupon_id_idx
  on public.coupon_redemptions(coupon_id);

create index coupon_redemptions_customer_user_id_idx
  on public.coupon_redemptions(customer_user_id)
  where customer_user_id is not null;

create index coupon_redemptions_coupon_customer_idx
  on public.coupon_redemptions(coupon_id, customer_user_id)
  where customer_user_id is not null;


alter table public.coupons
  enable row level security;

alter table public.coupon_products
  enable row level security;

alter table public.coupon_crafts
  enable row level security;

alter table public.coupon_redemptions
  enable row level security;


-- Explicit Data API grants.
-- Coupons and restrictions are admin-managed only in this foundation.
-- Redemption writes are intentionally not granted to authenticated clients.
-- A protected order transaction will own real redemption consumption later.

revoke all on table public.coupons
  from anon, authenticated;

revoke all on table public.coupon_products
  from anon, authenticated;

revoke all on table public.coupon_crafts
  from anon, authenticated;

revoke all on table public.coupon_redemptions
  from anon, authenticated;


grant select, insert, update, delete on table public.coupons
  to authenticated;

grant select, insert, update, delete on table public.coupon_products
  to authenticated;

grant select, insert, update, delete on table public.coupon_crafts
  to authenticated;

grant select on table public.coupon_redemptions
  to authenticated;


-- ============================================================
-- COUPONS RLS
-- ============================================================

create policy "Super admin can manage coupons"
on public.coupons
for all
to authenticated
using (
  (select private.is_super_admin())
)
with check (
  (select private.is_super_admin())
);


-- ============================================================
-- COUPON PRODUCT RESTRICTIONS RLS
-- ============================================================

create policy "Super admin can manage coupon products"
on public.coupon_products
for all
to authenticated
using (
  (select private.is_super_admin())
)
with check (
  (select private.is_super_admin())
);


-- ============================================================
-- COUPON CRAFT RESTRICTIONS RLS
-- ============================================================

create policy "Super admin can manage coupon crafts"
on public.coupon_crafts
for all
to authenticated
using (
  (select private.is_super_admin())
)
with check (
  (select private.is_super_admin())
);


-- ============================================================
-- COUPON REDEMPTION LEDGER RLS
-- ============================================================

create policy "Super admin can read coupon redemptions"
on public.coupon_redemptions
for select
to authenticated
using (
  (select private.is_super_admin())
);

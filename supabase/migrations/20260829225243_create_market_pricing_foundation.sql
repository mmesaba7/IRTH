-- S15.1 — Market & Pricing Foundation
--
-- Important:
-- 1. No launch market is created or activated by this migration.
-- 2. Legacy products.price is intentionally left unchanged.
-- 3. Approved live market prices are protected from direct artisan writes.

create table public.markets (
  id uuid primary key default gen_random_uuid(),

  country_id uuid not null
    references public.countries(id)
    on delete restrict,

  slug text not null unique,

  currency_code text not null,

  is_active boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint markets_slug_not_blank
    check (length(trim(slug)) > 0),

  constraint markets_currency_code_iso_format
    check (currency_code ~ '^[A-Z]{3}$')
);


create table public.product_market_prices (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null
    references public.products(id)
    on delete cascade,

  market_id uuid not null
    references public.markets(id)
    on delete restrict,

  price numeric not null,

  is_active boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_market_prices_positive_price
    check (price > 0),

  constraint product_market_prices_product_market_unique
    unique (product_id, market_id)
);


create index markets_country_id_idx
  on public.markets(country_id);

create index product_market_prices_product_id_idx
  on public.product_market_prices(product_id);

create index product_market_prices_market_id_idx
  on public.product_market_prices(market_id);


alter table public.markets
  enable row level security;

alter table public.product_market_prices
  enable row level security;


-- Explicit Data API grants.
-- RLS still decides which rows each user can access.

revoke all on table public.markets
  from anon, authenticated;

revoke all on table public.product_market_prices
  from anon, authenticated;


grant select on table public.markets
  to anon, authenticated;

grant select, insert, update, delete on table public.markets
  to authenticated;


grant select on table public.product_market_prices
  to anon, authenticated;

grant select, insert, update, delete on table public.product_market_prices
  to authenticated;


-- ============================================================
-- MARKETS RLS
-- ============================================================

create policy "Public can read active markets"
on public.markets
for select
to anon, authenticated
using (
  is_active = true
);


create policy "Super admin can manage markets"
on public.markets
for all
to authenticated
using (
  (select private.is_super_admin())
)
with check (
  (select private.is_super_admin())
);


-- ============================================================
-- PRODUCT MARKET PRICES RLS
-- ============================================================

create policy "Public can read active published market prices"
on public.product_market_prices
for select
to anon, authenticated
using (
  is_active = true

  and exists (
    select 1
    from public.markets m
    where m.id = product_market_prices.market_id
      and m.is_active = true
  )

  and exists (
    select 1
    from public.products p
    join public.artisan_profiles ap
      on ap.id = p.artisan_id
    join public.countries c
      on c.id = ap.country_id
    join public.crafts cr
      on cr.id = p.primary_craft_id
    where p.id = product_market_prices.product_id
      and p.lifecycle_status = 'published'
      and ap.status = 'active'
      and c.is_active = true
      and cr.is_active = true
  )
);


create policy "Artisans can read own market prices"
on public.product_market_prices
for select
to authenticated
using (
  exists (
    select 1
    from public.products p
    join public.artisan_profiles ap
      on ap.id = p.artisan_id
    where p.id = product_market_prices.product_id
      and ap.auth_user_id = (select auth.uid())
  )
);


create policy "Super admin can manage product market prices"
on public.product_market_prices
for all
to authenticated
using (
  (select private.is_super_admin())
)
with check (
  (select private.is_super_admin())
);

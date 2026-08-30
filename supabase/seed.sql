-- Local development / test seed data.
--
-- This file is executed by `supabase db reset` after all migrations.
-- It is NOT a production migration and must not be used as live catalog data.
--
-- S15.4.4 fixtures intentionally use simple prices and deterministic IDs so the
-- trusted Cart -> Promotion -> Coupon pipeline can be tested end-to-end.

-- Keep the existing demo marketplace chain publicly eligible in the local DB.
update public.artisan_profiles
set status = 'active'
where slug in ('ahmed-hassan', 'amina-zahra', 'omar-khalil');

update public.countries c
set is_active = true
where exists (
  select 1
  from public.artisan_profiles ap
  where ap.country_id = c.id
    and ap.slug in ('ahmed-hassan', 'amina-zahra', 'omar-khalil')
);

update public.crafts
set is_active = true
where slug in ('pottery-ceramics', 'textiles', 'metalwork');

update public.products
set lifecycle_status = 'published',
    quantity = 100,
    made_to_order = false,
    one_of_a_kind = false
where slug in ('clay-vessel', 'heritage-textile', 'copper-piece');

-- Synthetic products used only for exact rounding / allocation edge tests.
insert into public.products (
  id,
  slug,
  artisan_id,
  primary_craft_id,
  name_en,
  price,
  lifecycle_status,
  quantity,
  made_to_order,
  one_of_a_kind
)
select
  '00000000-0000-0000-0000-000000000010'::uuid,
  'coupon-rounding-item',
  ap.id,
  cr.id,
  'Coupon Rounding Test Item',
  10.05,
  'published',
  100,
  false,
  false
from public.artisan_profiles ap
join public.crafts cr on cr.slug = 'pottery-ceramics'
where ap.slug = 'ahmed-hassan'

union all

select
  '00000000-0000-0000-0000-000000000001'::uuid,
  'coupon-tie-a',
  ap.id,
  cr.id,
  'Coupon Tie Test A',
  1.00,
  'published',
  100,
  false,
  false
from public.artisan_profiles ap
join public.crafts cr on cr.slug = 'pottery-ceramics'
where ap.slug = 'ahmed-hassan'

union all

select
  '00000000-0000-0000-0000-000000000002'::uuid,
  'coupon-tie-b',
  ap.id,
  cr.id,
  'Coupon Tie Test B',
  1.00,
  'published',
  100,
  false,
  false
from public.artisan_profiles ap
join public.crafts cr on cr.slug = 'pottery-ceramics'
where ap.slug = 'ahmed-hassan'

on conflict (id) do nothing;

-- Deterministic Egypt Market prices. Legacy products.price remains irrelevant to
-- trusted quote calculation.
insert into public.product_market_prices (
  product_id,
  market_id,
  price,
  is_active
)
select
  p.id,
  m.id,
  fixture.price,
  true
from (
  values
    ('clay-vessel'::text, 100.00::numeric),
    ('heritage-textile'::text, 200.00::numeric),
    ('copper-piece'::text, 300.00::numeric),
    ('coupon-rounding-item'::text, 10.05::numeric),
    ('coupon-tie-a'::text, 1.00::numeric),
    ('coupon-tie-b'::text, 1.00::numeric)
) as fixture(product_slug, price)
join public.products p
  on p.slug = fixture.product_slug
join public.markets m
  on m.slug = 'egypt'
on conflict (product_id, market_id)
do update set
  price = excluded.price,
  is_active = true,
  updated_at = now();

-- Product Promotions used by the coupon interaction tests:
-- clay-vessel: 10% => 10.00 discount
-- heritage-textile: fixed 20.00 => 20.00 discount
-- copper-piece: 10% => 30.00 discount
insert into public.promotions (
  id,
  market_id,
  source_type,
  artisan_id,
  discount_type,
  discount_value,
  funding_source,
  approval_status,
  is_enabled,
  start_at,
  end_at
)
select
  fixture.promotion_id,
  m.id,
  'artisan',
  p.artisan_id,
  fixture.discount_type,
  fixture.discount_value,
  'artisan',
  'approved',
  true,
  '2000-01-01 00:00:00+00'::timestamptz,
  '2099-01-01 00:00:00+00'::timestamptz
from (
  values
    (
      '10000000-0000-0000-0000-000000000001'::uuid,
      'clay-vessel'::text,
      'percentage'::text,
      10.00::numeric
    ),
    (
      '10000000-0000-0000-0000-000000000002'::uuid,
      'heritage-textile'::text,
      'fixed'::text,
      20.00::numeric
    ),
    (
      '10000000-0000-0000-0000-000000000003'::uuid,
      'copper-piece'::text,
      'percentage'::text,
      10.00::numeric
    )
) as fixture(promotion_id, product_slug, discount_type, discount_value)
join public.products p
  on p.slug = fixture.product_slug
join public.markets m
  on m.slug = 'egypt'
on conflict (id) do nothing;

insert into public.promotion_products (promotion_id, product_id)
select
  fixture.promotion_id,
  p.id
from (
  values
    ('10000000-0000-0000-0000-000000000001'::uuid, 'clay-vessel'::text),
    ('10000000-0000-0000-0000-000000000002'::uuid, 'heritage-textile'::text),
    ('10000000-0000-0000-0000-000000000003'::uuid, 'copper-piece'::text)
) as fixture(promotion_id, product_slug)
join public.products p
  on p.slug = fixture.product_slug
on conflict (promotion_id, product_id) do nothing;

-- IRTH-funded Coupon fixtures.
insert into public.coupons (
  id,
  market_id,
  code,
  discount_type,
  discount_value,
  minimum_order_amount,
  max_discount_amount,
  stackable,
  funding_source,
  artisan_id,
  start_at,
  end_at,
  is_enabled
)
select
  fixture.coupon_id,
  m.id,
  fixture.code,
  fixture.discount_type,
  fixture.discount_value,
  fixture.minimum_order_amount,
  fixture.max_discount_amount,
  fixture.stackable,
  'irth',
  null,
  '2000-01-01 00:00:00+00'::timestamptz,
  '2099-01-01 00:00:00+00'::timestamptz,
  true
from (
  values
    (
      '20000000-0000-0000-0000-000000000001'::uuid,
      'STACK10'::text,
      'percentage'::text,
      10.00::numeric,
      null::numeric,
      null::numeric,
      true
    ),
    (
      '20000000-0000-0000-0000-000000000002'::uuid,
      'FIXED50'::text,
      'fixed'::text,
      50.00::numeric,
      null::numeric,
      null::numeric,
      true
    ),
    (
      '20000000-0000-0000-0000-000000000003'::uuid,
      'NONSTACK50'::text,
      'fixed'::text,
      50.00::numeric,
      null::numeric,
      null::numeric,
      false
    ),
    (
      '20000000-0000-0000-0000-000000000004'::uuid,
      'NONSTACK5'::text,
      'fixed'::text,
      5.00::numeric,
      null::numeric,
      null::numeric,
      false
    ),
    (
      '20000000-0000-0000-0000-000000000005'::uuid,
      'NONSTACK10'::text,
      'fixed'::text,
      10.00::numeric,
      null::numeric,
      null::numeric,
      false
    ),
    (
      '20000000-0000-0000-0000-000000000006'::uuid,
      'MIN100'::text,
      'percentage'::text,
      10.00::numeric,
      100.00::numeric,
      null::numeric,
      true
    ),
    (
      '20000000-0000-0000-0000-000000000007'::uuid,
      'MAX30'::text,
      'percentage'::text,
      50.00::numeric,
      null::numeric,
      30.00::numeric,
      true
    ),
    (
      '20000000-0000-0000-0000-000000000008'::uuid,
      'ROUND10'::text,
      'percentage'::text,
      10.00::numeric,
      null::numeric,
      null::numeric,
      true
    ),
    (
      '20000000-0000-0000-0000-000000000009'::uuid,
      'TIEPENNY'::text,
      'fixed'::text,
      0.01::numeric,
      null::numeric,
      null::numeric,
      true
    ),
    (
      '20000000-0000-0000-0000-000000000010'::uuid,
      'UNION10'::text,
      'percentage'::text,
      10.00::numeric,
      null::numeric,
      null::numeric,
      true
    )
) as fixture(
  coupon_id,
  code,
  discount_type,
  discount_value,
  minimum_order_amount,
  max_discount_amount,
  stackable
)
join public.markets m
  on m.slug = 'egypt'
on conflict (id) do nothing;

-- Artisan-funded Coupon: no explicit Product/Craft restrictions; DB scope must
-- still keep it inside Ahmed Hassan's products.
insert into public.coupons (
  id,
  market_id,
  code,
  discount_type,
  discount_value,
  stackable,
  funding_source,
  artisan_id,
  start_at,
  end_at,
  is_enabled
)
select
  '20000000-0000-0000-0000-000000000011'::uuid,
  m.id,
  'ARTISAN25',
  'fixed',
  25.00,
  true,
  'artisan',
  ap.id,
  '2000-01-01 00:00:00+00'::timestamptz,
  '2099-01-01 00:00:00+00'::timestamptz,
  true
from public.markets m
join public.artisan_profiles ap
  on ap.slug = 'ahmed-hassan'
where m.slug = 'egypt'
on conflict (id) do nothing;

-- Product restrictions for the Coupon scenarios.
insert into public.coupon_products (coupon_id, product_id)
select
  fixture.coupon_id,
  p.id
from (
  values
    ('20000000-0000-0000-0000-000000000001'::uuid, 'clay-vessel'::text),
    ('20000000-0000-0000-0000-000000000001'::uuid, 'heritage-textile'::text),
    ('20000000-0000-0000-0000-000000000002'::uuid, 'clay-vessel'::text),
    ('20000000-0000-0000-0000-000000000002'::uuid, 'heritage-textile'::text),
    ('20000000-0000-0000-0000-000000000003'::uuid, 'clay-vessel'::text),
    ('20000000-0000-0000-0000-000000000004'::uuid, 'clay-vessel'::text),
    ('20000000-0000-0000-0000-000000000005'::uuid, 'clay-vessel'::text),
    ('20000000-0000-0000-0000-000000000006'::uuid, 'clay-vessel'::text),
    ('20000000-0000-0000-0000-000000000007'::uuid, 'heritage-textile'::text),
    ('20000000-0000-0000-0000-000000000008'::uuid, 'coupon-rounding-item'::text),
    ('20000000-0000-0000-0000-000000000009'::uuid, 'coupon-tie-a'::text),
    ('20000000-0000-0000-0000-000000000009'::uuid, 'coupon-tie-b'::text),
    ('20000000-0000-0000-0000-000000000010'::uuid, 'clay-vessel'::text)
) as fixture(coupon_id, product_slug)
join public.products p
  on p.slug = fixture.product_slug
on conflict (coupon_id, product_id) do nothing;

-- UNION10 = explicitly selected clay-vessel OR all Textiles craft products.
insert into public.coupon_crafts (coupon_id, craft_id)
select
  '20000000-0000-0000-0000-000000000010'::uuid,
  cr.id
from public.crafts cr
where cr.slug = 'textiles'
on conflict (coupon_id, craft_id) do nothing;

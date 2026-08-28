insert into public.products (
  slug,
  artisan_id,
  primary_craft_id,
  name_en,
  price
)
select
  'clay-vessel',
  artisans.id,
  crafts.id,
  'Clay Vessel',
  85
from public.artisan_profiles artisans
cross join public.crafts crafts
where artisans.slug = 'ahmed-hassan'
  and crafts.slug = 'pottery-ceramics'

union all

select
  'heritage-textile',
  artisans.id,
  crafts.id,
  'Heritage Textile',
  120
from public.artisan_profiles artisans
cross join public.crafts crafts
where artisans.slug = 'amina-zahra'
  and crafts.slug = 'textiles'

union all

select
  'copper-piece',
  artisans.id,
  crafts.id,
  'Copper Piece',
  145
from public.artisan_profiles artisans
cross join public.crafts crafts
where artisans.slug = 'omar-khalil'
  and crafts.slug = 'metalwork'

on conflict (slug) do nothing;
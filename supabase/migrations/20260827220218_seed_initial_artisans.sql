insert into public.artisan_profiles (
  slug,
  name_en,
  country_id,
  region_en,
  bio_en,
  story_en,
  primary_craft_id
)
select
  'ahmed-hassan',
  'Ahmed Hassan',
  countries.id,
  'Upper Egypt',
  'A pottery artisan preserving traditional clay techniques through handmade objects rooted in the heritage of Upper Egypt.',
  'Ahmed works with natural clay and traditional shaping techniques passed through generations. Each piece is made by hand, carrying small variations that reflect the process and the person behind it.',
  crafts.id
from public.countries
cross join public.crafts
where countries.slug = 'egypt'
  and crafts.slug = 'pottery-ceramics'

union all

select
  'amina-zahra',
  'Amina Zahra',
  countries.id,
  'Morocco',
  'A textile artisan creating handwoven pieces inspired by Moroccan patterns, materials, and cultural memory.',
  'Amina''s work brings together traditional weaving techniques and patterns shaped by place and memory. Every textile is created slowly by hand, allowing the character of the maker to remain visible in the finished piece.',
  crafts.id
from public.countries
cross join public.crafts
where countries.slug = 'morocco'
  and crafts.slug = 'textiles'

union all

select
  'omar-khalil',
  'Omar Khalil',
  countries.id,
  'Jordan',
  'A metalwork artisan shaping copper by hand using traditional techniques rooted in Jordanian craft heritage.',
  'Omar works with copper through a process of hand forging and traditional surface treatment. The marks left on each piece are part of the craft itself, giving every object its own character.',
  crafts.id
from public.countries
cross join public.crafts
where countries.slug = 'jordan'
  and crafts.slug = 'metalwork'

on conflict (slug) do nothing;
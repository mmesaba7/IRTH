insert into public.crafts (
  slug,
  name_ar,
  name_en,
  icon
)
values
  ('pottery-ceramics', 'الخزف والفخار', 'Pottery & Ceramics', '🏺'),
  ('textiles', 'المنسوجات', 'Textiles', '🧵'),
  ('metalwork', 'الأعمال المعدنية', 'Metalwork', '⚒️'),
  ('woodwork', 'الأعمال الخشبية', 'Woodwork', '🪵')
on conflict (slug) do nothing;
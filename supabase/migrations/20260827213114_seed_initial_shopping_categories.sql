insert into public.shopping_categories (
  slug,
  name_ar,
  name_en
)
values
  ('home-decor', 'ديكور المنزل', 'Home Decor'),
  ('textiles-soft-furnishings', 'المنسوجات والمفروشات', 'Textiles & Soft Furnishings'),
  ('tableware-serveware', 'أدوات المائدة والتقديم', 'Tableware & Serveware'),
  ('accessories', 'الإكسسوارات', 'Accessories'),
  ('gifts', 'الهدايا', 'Gifts')
on conflict (slug) do nothing;
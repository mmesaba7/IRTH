insert into public.countries (
  slug,
  name_ar,
  name_en
)
values
  ('egypt', 'مصر', 'Egypt'),
  ('saudi-arabia', 'المملكة العربية السعودية', 'Saudi Arabia'),
  ('uae', 'الإمارات العربية المتحدة', 'UAE')
on conflict (slug) do nothing;
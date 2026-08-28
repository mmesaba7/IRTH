insert into public.countries (
  slug,
  name_ar,
  name_en
)
values
  ('morocco', 'المغرب', 'Morocco'),
  ('jordan', 'الأردن', 'Jordan')
on conflict (slug) do nothing;
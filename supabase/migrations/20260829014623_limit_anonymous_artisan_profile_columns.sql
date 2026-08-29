revoke select on table public.artisan_profiles from anon;

grant select (
  id,
  slug,
  name_ar,
  name_en,
  country_id,
  region_ar,
  region_en,
  bio_ar,
  bio_en,
  story_ar,
  story_en,
  primary_craft_id,
  profile_image_url,
  video_url,
  status,
  created_at,
  updated_at
) on table public.artisan_profiles to anon;;

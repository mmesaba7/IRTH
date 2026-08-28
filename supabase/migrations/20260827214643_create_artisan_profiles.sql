create table public.artisan_profiles (
  id uuid primary key default gen_random_uuid(),

  slug text not null unique,

  name_ar text,
  name_en text not null,

  country_id uuid not null
    references public.countries(id),

  region_ar text,
  region_en text,

  bio_ar text,
  bio_en text,

  story_ar text,
  story_en text,

  primary_craft_id uuid not null
    references public.crafts(id),

  profile_image_url text,
  video_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.artisan_profiles enable row level security;
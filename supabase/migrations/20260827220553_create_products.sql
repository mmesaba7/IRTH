create table public.products (
  id uuid primary key default gen_random_uuid(),

  slug text not null unique,

  artisan_id uuid not null
    references public.artisan_profiles(id),

  primary_craft_id uuid not null
    references public.crafts(id),

  name_ar text,
  name_en text not null,

  description_ar text,
  description_en text,

  story_ar text,
  story_en text,

  material_ar text,
  material_en text,

  price numeric(12, 2) not null
    check (price >= 0),

  dimensions text,
  weight text,

  made_to_order boolean not null default false,
  preparation_time text,

  one_of_a_kind boolean not null default false,
  customization boolean not null default false,

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
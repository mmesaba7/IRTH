create table public.shopping_categories (
  id uuid primary key default gen_random_uuid(),

  slug text not null unique,

  name_ar text not null,
  name_en text not null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shopping_categories enable row level security;

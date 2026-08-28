-- =========================================================
-- 1. User accounts
-- Public app-side identity linked to Supabase Auth
-- =========================================================

create table public.user_accounts (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  display_name text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_accounts enable row level security;


-- =========================================================
-- 2. Roles
-- =========================================================

create table public.roles (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,
  name text not null,

  created_at timestamptz not null default now()
);

alter table public.roles enable row level security;


-- =========================================================
-- 3. User ↔ Roles
-- =========================================================

create table public.user_roles (
  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  role_id uuid not null
    references public.roles(id),

  created_at timestamptz not null default now(),

  primary key (user_id, role_id)
);

alter table public.user_roles enable row level security;


-- =========================================================
-- 4. Initial MVP roles
-- =========================================================

insert into public.roles (
  code,
  name
)
values
  ('customer', 'Customer'),
  ('artisan', 'Artisan'),
  ('super_admin', 'Super Admin')
on conflict (code) do nothing;


-- =========================================================
-- 5. Link artisan public profile to Auth account
-- Existing artisan records remain valid without login account yet
-- =========================================================

alter table public.artisan_profiles
add column auth_user_id uuid unique
references auth.users(id)
on delete set null;
create table public.artisan_crafts (
  artisan_id uuid not null
    references public.artisan_profiles(id)
    on delete cascade,

  craft_id uuid not null
    references public.crafts(id),

  created_at timestamptz not null default now(),

  primary key (artisan_id, craft_id)
);

alter table public.artisan_crafts enable row level security;
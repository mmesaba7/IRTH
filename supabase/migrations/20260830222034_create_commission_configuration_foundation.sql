create table public.craft_commission_rates (
  craft_id uuid primary key references public.crafts(id) on delete cascade,
  rate_percent numeric(5,2) not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint craft_commission_rates_rate_range check (rate_percent >= 0 and rate_percent <= 100)
);

create table public.artisan_commission_overrides (
  artisan_id uuid primary key references public.artisan_profiles(id) on delete cascade,
  rate_percent numeric(5,2) not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artisan_commission_overrides_rate_range check (rate_percent >= 0 and rate_percent <= 100)
);

alter table public.craft_commission_rates enable row level security;
alter table public.artisan_commission_overrides enable row level security;

revoke all on public.craft_commission_rates from anon, authenticated;
revoke all on public.artisan_commission_overrides from anon, authenticated;
grant select, insert, update, delete on public.craft_commission_rates to authenticated;
grant select, insert, update, delete on public.artisan_commission_overrides to authenticated;

create policy "Super admin can manage craft commission rates"
on public.craft_commission_rates
for all
to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));

create policy "Super admin can manage artisan commission overrides"
on public.artisan_commission_overrides
for all
to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));
create table public.market_shipping_settings (
  market_id uuid primary key references public.markets(id) on delete cascade,
  flat_shipping_fee numeric not null,
  free_shipping_threshold numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_shipping_settings_flat_fee_non_negative
    check (flat_shipping_fee >= 0),
  constraint market_shipping_settings_threshold_positive
    check (free_shipping_threshold > 0)
);

alter table public.market_shipping_settings enable row level security;

revoke all on table public.market_shipping_settings from anon, authenticated;
grant select on table public.market_shipping_settings to anon, authenticated;
grant insert, update, delete on table public.market_shipping_settings to authenticated;

create policy "Public can read active market shipping settings"
on public.market_shipping_settings
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.markets m
    where m.id = market_shipping_settings.market_id
      and m.is_active = true
  )
);

create policy "Super admin can insert market shipping settings"
on public.market_shipping_settings
for insert
to authenticated
with check ((select private.is_super_admin()));

create policy "Super admin can update market shipping settings"
on public.market_shipping_settings
for update
to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));

create policy "Super admin can delete market shipping settings"
on public.market_shipping_settings
for delete
to authenticated
using ((select private.is_super_admin()));

create or replace function public.get_market_shipping_settings_text(target_market_id uuid)
returns table (
  market_id uuid,
  flat_shipping_fee text,
  free_shipping_threshold text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.market_id,
    s.flat_shipping_fee::text,
    s.free_shipping_threshold::text
  from public.market_shipping_settings s
  where s.market_id = target_market_id
  limit 1;
$$;

revoke all on function public.get_market_shipping_settings_text(uuid) from public;
grant execute on function public.get_market_shipping_settings_text(uuid) to anon, authenticated;

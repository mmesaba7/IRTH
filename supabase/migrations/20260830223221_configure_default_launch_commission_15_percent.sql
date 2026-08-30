insert into public.craft_commission_rates (craft_id, rate_percent)
select c.id, 15.00
from public.crafts c
where c.is_active = true
on conflict (craft_id) do update
set rate_percent = excluded.rate_percent,
    updated_at = now();

delete from public.artisan_commission_overrides;

create or replace function public.get_market_shipping_settings_text(target_market_id uuid)
returns table(
  market_id uuid,
  flat_shipping_fee text,
  free_shipping_threshold text
)
language sql
stable
set search_path to ''
as $function$
  select
    s.market_id,
    s.flat_shipping_fee::text,
    s.free_shipping_threshold::text
  from public.market_shipping_settings s
  where s.market_id = target_market_id
  limit 1;
$function$;

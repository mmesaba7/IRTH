create or replace function public.get_product_market_prices_text(
  target_market_id uuid,
  target_product_ids uuid[]
)
returns table (
  product_id uuid,
  price text
)
language sql
security invoker
set search_path = ''
as $$
  select
    pmp.product_id,
    pmp.price::text
  from public.product_market_prices pmp
  where pmp.market_id = target_market_id
    and pmp.is_active = true
    and pmp.product_id = any(target_product_ids);
$$;

revoke all on function public.get_product_market_prices_text(uuid, uuid[])
  from public;
revoke all on function public.get_product_market_prices_text(uuid, uuid[])
  from anon;
revoke all on function public.get_product_market_prices_text(uuid, uuid[])
  from authenticated;

grant execute on function public.get_product_market_prices_text(uuid, uuid[])
  to anon, authenticated;

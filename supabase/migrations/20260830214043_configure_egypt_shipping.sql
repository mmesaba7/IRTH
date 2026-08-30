do $$
declare
  egypt_market_id uuid;
begin
  select id
    into strict egypt_market_id
  from public.markets
  where slug = 'egypt'
    and currency_code = 'EGP';

  insert into public.market_shipping_settings (
    market_id,
    flat_shipping_fee,
    free_shipping_threshold
  )
  values (
    egypt_market_id,
    150,
    2000
  )
  on conflict (market_id) do update
    set flat_shipping_fee = excluded.flat_shipping_fee,
        free_shipping_threshold = excluded.free_shipping_threshold,
        updated_at = now();
end
$$;

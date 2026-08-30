grant select, insert on table public.orders to service_role;
grant insert on table public.order_customer_details to service_role;
grant select, insert, update on table public.order_artisan_groups to service_role;
grant select, insert on table public.order_items to service_role;
grant insert on table public.order_status_history to service_role;

grant select, insert on table public.coupon_redemptions to service_role;

grant select, update on table public.markets to service_role;
grant select, update on table public.market_shipping_settings to service_role;
grant select, update on table public.coupons to service_role;
grant select, update on table public.products to service_role;
grant select, update on table public.product_market_prices to service_role;
grant select, update on table public.promotions to service_role;

grant select on table public.artisan_profiles to service_role;
grant select on table public.crafts to service_role;
grant select on table public.countries to service_role;
grant select on table public.promotion_products to service_role;
grant select on table public.artisan_commission_overrides to service_role;
grant select on table public.craft_commission_rates to service_role;

grant usage, select on sequence public.order_status_history_id_seq to service_role;

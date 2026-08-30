create or replace function private.get_my_artisan_orders()
returns table (
  artisan_group_id uuid,
  order_id uuid,
  order_number text,
  order_status text,
  payment_status text,
  fulfillment_status text,
  currency_code text,
  artisan_merchandise_subtotal text,
  customer_display_name text,
  customer_country_code text,
  created_at timestamptz,
  items jsonb
)
language sql
security definer
set search_path = ''
as $$
  select
    g.id as artisan_group_id,
    o.id as order_id,
    o.order_number,
    o.status as order_status,
    o.payment_status,
    g.fulfillment_status,
    o.currency_code,
    g.merchandise_subtotal::text as artisan_merchandise_subtotal,
    case
      when d.recipient_name is null then null
      else array_to_string((regexp_split_to_array(trim(d.recipient_name), E'\\s+'))[1:2], ' ')
    end as customer_display_name,
    d.country_code as customer_country_code,
    o.created_at,
    coalesce(item_rows.items, '[]'::jsonb) as items
  from public.order_artisan_groups g
  join public.orders o on o.id = g.order_id
  join public.artisan_profiles a
    on a.id = g.artisan_id
   and a.auth_user_id = (select auth.uid())
  left join public.order_customer_details d on d.order_id = o.id
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', oi.id,
        'productSlug', oi.product_slug_snapshot,
        'productNameAr', oi.product_name_ar_snapshot,
        'productNameEn', oi.product_name_en_snapshot,
        'quantity', oi.quantity,
        'unitPrice', oi.unit_price::text,
        'originalLineTotal', oi.original_line_total::text,
        'promotionDiscount', oi.promotion_discount::text,
        'couponDiscount', oi.coupon_discount::text,
        'lineTotal', oi.line_total::text
      )
      order by oi.created_at, oi.id
    ) as items
    from public.order_items oi
    where oi.artisan_group_id = g.id
      and oi.artisan_id = g.artisan_id
  ) item_rows on true
  where (select auth.uid()) is not null
  order by o.created_at desc, g.id;
$$;

revoke all on function private.get_my_artisan_orders() from public, anon;
grant execute on function private.get_my_artisan_orders() to authenticated;

create or replace function public.get_my_artisan_orders()
returns table (
  artisan_group_id uuid,
  order_id uuid,
  order_number text,
  order_status text,
  payment_status text,
  fulfillment_status text,
  currency_code text,
  artisan_merchandise_subtotal text,
  customer_display_name text,
  customer_country_code text,
  created_at timestamptz,
  items jsonb
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.get_my_artisan_orders();
$$;

revoke all on function public.get_my_artisan_orders() from public, anon;
grant execute on function public.get_my_artisan_orders() to authenticated;

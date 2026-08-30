create or replace function private.get_admin_orders()
returns table(
  order_id uuid,
  order_number text,
  order_status text,
  payment_status text,
  currency_code text,
  subtotal_before_promotions text,
  promotion_discount_total text,
  coupon_discount_total text,
  merchandise_subtotal text,
  shipping_fee text,
  final_total text,
  customer_recipient_name text,
  customer_email text,
  customer_phone text,
  customer_country_code text,
  customer_administrative_area text,
  customer_city text,
  customer_address_line1 text,
  customer_delivery_notes text,
  created_at timestamptz,
  artisan_groups jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select private.is_super_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  return query
  select
    o.id as order_id,
    o.order_number,
    o.status as order_status,
    o.payment_status,
    o.currency_code,
    o.subtotal_before_promotions::text,
    o.promotion_discount_total::text,
    o.coupon_discount_total::text,
    o.merchandise_subtotal::text,
    o.shipping_fee::text,
    o.final_total::text,
    d.recipient_name as customer_recipient_name,
    d.email as customer_email,
    d.phone as customer_phone,
    d.country_code as customer_country_code,
    d.administrative_area as customer_administrative_area,
    d.city as customer_city,
    d.address_line1 as customer_address_line1,
    d.delivery_notes as customer_delivery_notes,
    o.created_at,
    coalesce(group_rows.artisan_groups, '[]'::jsonb) as artisan_groups
  from public.orders o
  left join public.order_customer_details d on d.order_id = o.id
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'artisanGroupId', g.id,
        'artisanId', g.artisan_id,
        'artisanNameAr', a.name_ar,
        'artisanNameEn', a.name_en,
        'fulfillmentStatus', g.fulfillment_status,
        'merchandiseSubtotal', g.merchandise_subtotal::text,
        'items', coalesce(item_rows.items, '[]'::jsonb)
      )
      order by g.created_at, g.id
    ) as artisan_groups
    from public.order_artisan_groups g
    join public.artisan_profiles a on a.id = g.artisan_id
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
          'lineTotal', oi.line_total::text,
          'commissionRatePercent', oi.commission_rate_percent::text
        )
        order by oi.created_at, oi.id
      ) as items
      from public.order_items oi
      where oi.artisan_group_id = g.id
        and oi.artisan_id = g.artisan_id
    ) item_rows on true
    where g.order_id = o.id
  ) group_rows on true
  order by o.created_at desc, o.id;
end;
$$;

revoke all on function private.get_admin_orders() from public, anon;
grant execute on function private.get_admin_orders() to authenticated;

create or replace function public.get_admin_orders()
returns table(
  order_id uuid,
  order_number text,
  order_status text,
  payment_status text,
  currency_code text,
  subtotal_before_promotions text,
  promotion_discount_total text,
  coupon_discount_total text,
  merchandise_subtotal text,
  shipping_fee text,
  final_total text,
  customer_recipient_name text,
  customer_email text,
  customer_phone text,
  customer_country_code text,
  customer_administrative_area text,
  customer_city text,
  customer_address_line1 text,
  customer_delivery_notes text,
  created_at timestamptz,
  artisan_groups jsonb
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.get_admin_orders();
$$;

revoke all on function public.get_admin_orders() from public, anon;
grant execute on function public.get_admin_orders() to authenticated;

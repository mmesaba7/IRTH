revoke all on table public.orders from public, anon, authenticated;
revoke all on table public.order_customer_details from public, anon, authenticated;
revoke all on table public.order_artisan_groups from public, anon, authenticated;
revoke all on table public.order_items from public, anon, authenticated;
revoke all on table public.shipments from public, anon, authenticated;
revoke all on table public.order_status_history from public, anon, authenticated;

grant select on table public.orders to service_role;
grant select on table public.order_items to service_role;
grant select on table public.shipments to service_role;
grant select on table public.order_status_history to service_role;

create or replace function private.build_customer_order_payload(p_order_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'orderNumber', o.order_number,
    'status', o.status,
    'paymentStatus', o.payment_status,
    'currencyCode', o.currency_code,
    'subtotalBeforePromotions', o.subtotal_before_promotions::text,
    'promotionDiscountTotal', o.promotion_discount_total::text,
    'couponDiscountTotal', o.coupon_discount_total::text,
    'merchandiseSubtotal', o.merchandise_subtotal::text,
    'shippingFee', o.shipping_fee::text,
    'finalTotal', o.final_total::text,
    'couponCode', o.coupon_code_snapshot,
    'createdAt', o.created_at,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'slug', oi.product_slug_snapshot,
          'nameAr', oi.product_name_ar_snapshot,
          'nameEn', oi.product_name_en_snapshot,
          'quantity', oi.quantity,
          'unitPrice', oi.unit_price::text,
          'originalLineTotal', oi.original_line_total::text,
          'promotionDiscount', oi.promotion_discount::text,
          'couponDiscount', oi.coupon_discount::text,
          'lineTotal', oi.line_total::text
        )
        order by oi.created_at, oi.id
      )
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb),
    'timeline', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'status', h.status,
          'createdAt', h.created_at
        )
        order by h.created_at, h.id
      )
      from public.order_status_history h
      where h.order_id = o.id
    ), '[]'::jsonb),
    'shipments', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'status', s.status,
          'courierCode', s.courier_code,
          'trackingNumber', s.tracking_number,
          'trackingUrl', s.tracking_url,
          'shippedAt', s.shipped_at,
          'deliveredAt', s.delivered_at,
          'createdAt', s.created_at
        )
        order by s.created_at, s.id
      )
      from public.shipments s
      where s.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order_id;
$$;

revoke all on function private.build_customer_order_payload(uuid) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.build_customer_order_payload(uuid) to service_role;

create or replace function private.get_my_customer_orders()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(
      private.build_customer_order_payload(o.id)
      order by o.created_at desc, o.id desc
    )
    from public.orders o
    where o.customer_user_id = v_user_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_my_customer_orders()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_my_customer_orders();
$$;

revoke all on function private.get_my_customer_orders() from public, anon;
grant execute on function private.get_my_customer_orders() to authenticated;
revoke all on function public.get_my_customer_orders() from public, anon;
grant execute on function public.get_my_customer_orders() to authenticated;

create or replace function public.get_guest_order_tracking(
  p_order_number text,
  p_guest_access_token_hash text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.build_customer_order_payload(o.id)
  from public.orders o
  where o.order_number = trim(p_order_number)
    and o.customer_user_id is null
    and o.guest_access_token_hash = lower(trim(p_guest_access_token_hash))
  limit 1;
$$;

revoke all on function public.get_guest_order_tracking(text,text) from public, anon, authenticated;
grant execute on function public.get_guest_order_tracking(text,text) to service_role;

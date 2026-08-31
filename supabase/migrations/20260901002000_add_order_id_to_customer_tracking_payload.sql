create or replace function private.build_customer_order_payload(p_order_id uuid)
returns jsonb language sql set search_path='' as $$
  select jsonb_build_object(
    'orderId',o.id,
    'orderNumber',o.order_number,'status',o.status,'paymentStatus',o.payment_status,'currencyCode',o.currency_code,
    'subtotalBeforePromotions',o.subtotal_before_promotions::text,'promotionDiscountTotal',o.promotion_discount_total::text,
    'couponDiscountTotal',o.coupon_discount_total::text,'merchandiseSubtotal',o.merchandise_subtotal::text,
    'shippingFee',o.shipping_fee::text,'finalTotal',o.final_total::text,'couponCode',o.coupon_code_snapshot,'createdAt',o.created_at,
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'orderItemId',oi.id,'slug',oi.product_slug_snapshot,'nameAr',oi.product_name_ar_snapshot,'nameEn',oi.product_name_en_snapshot,
      'quantity',oi.quantity,'unitPrice',oi.unit_price::text,'originalLineTotal',oi.original_line_total::text,
      'promotionDiscount',oi.promotion_discount::text,'couponDiscount',oi.coupon_discount::text,'lineTotal',oi.line_total::text,
      'deliveredAt',s.delivered_at,'reviewId',r.id,'reviewStatus',r.status,'reviewEditCount',coalesce(r.edit_count,0)
    ) order by oi.created_at,oi.id) from public.order_items oi
      left join public.shipments s on s.artisan_group_id=oi.artisan_group_id
      left join private.customer_reviews r on r.order_item_id=oi.id where oi.order_id=o.id),'[]'::jsonb),
    'timeline',coalesce((select jsonb_agg(jsonb_build_object('status',h.status,'createdAt',h.created_at) order by h.created_at,h.id) from public.order_status_history h where h.order_id=o.id),'[]'::jsonb),
    'shipments',coalesce((select jsonb_agg(jsonb_build_object(
      'status',s.status,'courierCode',s.courier_code,'trackingNumber',s.tracking_number,'trackingUrl',s.tracking_url,
      'shippedAt',s.shipped_at,'deliveredAt',s.delivered_at,'returnWindowDays',s.return_window_days_snapshot,
      'returnWindowEndsAt',s.return_window_ends_at,'createdAt',s.created_at
    ) order by s.created_at,s.id) from public.shipments s where s.order_id=o.id),'[]'::jsonb)
  ) from public.orders o where o.id=p_order_id;
$$;

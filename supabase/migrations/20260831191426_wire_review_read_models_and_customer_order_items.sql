-- Review integration read models + customer order item identity.
create or replace function private.build_customer_order_payload(p_order_id uuid)
returns jsonb language sql set search_path='' as $$
  select jsonb_build_object(
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

create or replace function public.get_customer_review_context(p_order_item_id uuid,p_customer_user_id uuid,p_guest_access_token_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_item public.order_items%rowtype; v_order public.orders%rowtype; v_shipment public.shipments%rowtype; v_review private.customer_reviews%rowtype;
begin
  select * into v_item from public.order_items where id=p_order_item_id; if not found then return null; end if;
  select * into v_order from public.orders where id=v_item.order_id;
  if p_customer_user_id is not null then if v_order.customer_user_id is distinct from p_customer_user_id then return null; end if;
  else if p_guest_access_token_hash is null or v_order.guest_access_token_hash is distinct from p_guest_access_token_hash then return null; end if; end if;
  select * into v_shipment from public.shipments where artisan_group_id=v_item.artisan_group_id order by created_at desc limit 1;
  select * into v_review from private.customer_reviews where order_item_id=v_item.id;
  return jsonb_build_object('orderItemId',v_item.id,'orderNumber',v_order.order_number,'productSlug',v_item.product_slug_snapshot,
    'productNameAr',v_item.product_name_ar_snapshot,'productNameEn',v_item.product_name_en_snapshot,'quantity',v_item.quantity,
    'deliveredAt',v_shipment.delivered_at,'eligible',v_shipment.delivered_at is not null,
    'review',case when v_review.id is null then null else jsonb_build_object('id',v_review.id,'productRating',v_review.product_rating,
      'artisanRating',v_review.artisan_rating,'reviewText',v_review.review_text,'status',v_review.status,'editCount',v_review.edit_count,
      'createdAt',v_review.created_at,'updatedAt',v_review.updated_at) end);
end;$$;
revoke all on function public.get_customer_review_context(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.get_customer_review_context(uuid,uuid,text) to service_role;

create or replace function public.get_artisan_reviews_dashboard(p_artisan_id uuid,p_requester_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform private.require_artisan_payout_requester(p_artisan_id,p_requester_user_id);
  return coalesce((select jsonb_agg(jsonb_build_object(
    'reviewId',r.id,'productSlug',r.product_slug_snapshot,'productNameAr',r.product_name_ar_snapshot,'productNameEn',r.product_name_en_snapshot,
    'productRating',r.product_rating,'artisanRating',r.artisan_rating,'reviewText',r.review_text,'createdAt',r.created_at,'edited',r.edit_count=1,
    'reply',case when ar.id is null then null else jsonb_build_object('id',ar.id,'text',ar.reply_text,'status',ar.status,'moderationNote',ar.moderation_note,'createdAt',ar.created_at) end
  ) order by r.created_at desc) from private.customer_reviews r left join private.review_artisan_replies ar on ar.review_id=r.id
  where r.artisan_id=p_artisan_id and r.status='published'),'[]'::jsonb);
end;$$;
revoke all on function public.get_artisan_reviews_dashboard(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_artisan_reviews_dashboard(uuid,uuid) to service_role;

create or replace function public.get_review_moderation_queue(p_admin_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform private.require_super_admin_user(p_admin_user_id);
  return jsonb_build_object(
    'reviews',coalesce((select jsonb_agg(jsonb_build_object(
      'id',r.id,'productSlug',r.product_slug_snapshot,'productNameAr',r.product_name_ar_snapshot,'productNameEn',r.product_name_en_snapshot,
      'artisanId',r.artisan_id,'artisanName',coalesce(a.name_ar,a.name_en,a.slug),'productRating',r.product_rating,'artisanRating',r.artisan_rating,
      'reviewText',r.review_text,'editCount',r.edit_count,'createdAt',r.created_at) order by r.created_at)
      from private.customer_reviews r join public.artisan_profiles a on a.id=r.artisan_id where r.status='pending_review'),'[]'::jsonb),
    'replies',coalesce((select jsonb_agg(jsonb_build_object(
      'id',ar.id,'reviewId',r.id,'productSlug',r.product_slug_snapshot,'productNameAr',r.product_name_ar_snapshot,'productNameEn',r.product_name_en_snapshot,
      'artisanId',ar.artisan_id,'artisanName',coalesce(a.name_ar,a.name_en,a.slug),'reviewText',r.review_text,'replyText',ar.reply_text,'createdAt',ar.created_at) order by ar.created_at)
      from private.review_artisan_replies ar join private.customer_reviews r on r.id=ar.review_id join public.artisan_profiles a on a.id=ar.artisan_id
      where ar.status='pending_review' and r.status='published'),'[]'::jsonb)
  );
end;$$;
revoke all on function public.get_review_moderation_queue(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_review_moderation_queue(uuid) to service_role;

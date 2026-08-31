alter table public.order_items
  add column if not exists customization_text_snapshot text;

alter table public.order_items
  drop constraint if exists order_items_customization_text_snapshot_length;

alter table public.order_items
  add constraint order_items_customization_text_snapshot_length
  check (customization_text_snapshot is null or char_length(customization_text_snapshot) between 1 and 500);

create index if not exists commission_configuration_history_changed_by_user_idx
  on private.commission_configuration_history(changed_by_user_id);

-- Order creation keeps browser input untrusted: customization is validated against
-- the published product capability and snapshotted on the immutable order item.
create or replace function public.create_order_transaction(
  p_order jsonb,
  p_customer jsonb,
  p_items jsonb,
  p_idempotency_scope text,
  p_idempotency_key text,
  p_guest_access_token_hash text default null
)
returns table(order_id uuid, order_number text, reused boolean)
language plpgsql
set search_path to ''
as $function$
declare
  v_existing public.orders%rowtype;
  v_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_market_id uuid;
  v_currency_code text;
  v_customer_user_id uuid;
  v_coupon_id uuid;
  v_coupon_code text;
  v_guest_identity_hash text;
  v_subtotal_before_promotions numeric;
  v_promotion_discount_total numeric;
  v_coupon_discount_total numeric;
  v_merchandise_subtotal numeric;
  v_shipping_fee numeric;
  v_final_total numeric;
  v_flat_shipping_fee numeric;
  v_free_shipping_threshold numeric;
  v_expected_shipping numeric;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_unit_price numeric;
  v_original_line_total numeric;
  v_promotion_discount numeric;
  v_coupon_discount numeric;
  v_line_total numeric;
  v_promotion_funding_irth numeric;
  v_promotion_funding_artisan numeric;
  v_coupon_funding_irth numeric;
  v_coupon_funding_artisan numeric;
  v_promotion_id uuid;
  v_commission_rate numeric;
  v_group_id uuid;
  v_customization_text text;
  v_sum_original numeric := 0;
  v_sum_promotion numeric := 0;
  v_sum_coupon numeric := 0;
  v_sum_line numeric := 0;
  v_coupon public.coupons%rowtype;
  v_usage_count integer;
  v_customer_usage_count integer;
begin
  if p_idempotency_scope is null or length(trim(p_idempotency_scope)) < 3 or
     p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'invalid_idempotency';
  end if;

  select * into v_existing
  from public.orders
  where idempotency_scope = p_idempotency_scope
    and idempotency_key = p_idempotency_key
  limit 1;

  if found then
    return query select v_existing.id, v_existing.order_number, true;
    return;
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'invalid_order_items';
  end if;

  v_market_id := nullif(p_order->>'marketId','')::uuid;
  v_currency_code := upper(trim(p_order->>'currencyCode'));
  v_customer_user_id := nullif(p_order->>'customerUserId','')::uuid;
  v_coupon_id := nullif(p_order->>'couponId','')::uuid;
  v_coupon_code := nullif(trim(p_order->>'couponCode'),'');
  v_guest_identity_hash := nullif(trim(p_order->>'guestIdentityHash'),'');
  v_subtotal_before_promotions := (p_order->>'subtotalBeforePromotions')::numeric;
  v_promotion_discount_total := (p_order->>'promotionDiscountTotal')::numeric;
  v_coupon_discount_total := (p_order->>'couponDiscountTotal')::numeric;
  v_merchandise_subtotal := (p_order->>'merchandiseSubtotal')::numeric;
  v_shipping_fee := (p_order->>'shippingFee')::numeric;
  v_final_total := (p_order->>'finalTotal')::numeric;

  if v_customer_user_id is null and (p_guest_access_token_hash is null or length(trim(p_guest_access_token_hash)) < 32) then
    raise exception 'guest_access_token_required';
  end if;

  perform 1 from public.markets m
  where m.id=v_market_id and m.is_active=true and m.currency_code=v_currency_code for share;
  if not found then raise exception 'market_changed'; end if;

  select s.flat_shipping_fee,s.free_shipping_threshold
  into v_flat_shipping_fee,v_free_shipping_threshold
  from public.market_shipping_settings s where s.market_id=v_market_id for share;
  if not found then raise exception 'shipping_configuration_missing'; end if;

  v_expected_shipping := case when v_merchandise_subtotal >= v_free_shipping_threshold then 0 else v_flat_shipping_fee end;
  if v_shipping_fee <> v_expected_shipping or
     v_final_total <> v_merchandise_subtotal + v_shipping_fee or
     v_merchandise_subtotal <> v_subtotal_before_promotions - v_promotion_discount_total - v_coupon_discount_total then
    raise exception 'order_totals_changed';
  end if;

  if v_coupon_id is not null then
    select * into v_coupon from public.coupons c where c.id=v_coupon_id for update;
    if not found or v_coupon.market_id<>v_market_id or v_coupon.is_enabled is not true or
       now()<v_coupon.start_at or now()>=v_coupon.end_at or
       upper(trim(v_coupon.code))<>upper(trim(coalesce(v_coupon_code,''))) then raise exception 'coupon_changed'; end if;
    select count(*)::int into v_usage_count from public.coupon_redemptions cr where cr.coupon_id=v_coupon_id;
    if v_coupon.total_usage_limit is not null and v_usage_count>=v_coupon.total_usage_limit then raise exception 'coupon_usage_exhausted'; end if;
    if v_coupon.per_customer_usage_limit is not null then
      if v_customer_user_id is not null then
        select count(*)::int into v_customer_usage_count from public.coupon_redemptions cr where cr.coupon_id=v_coupon_id and cr.customer_user_id=v_customer_user_id;
      else
        if v_guest_identity_hash is null then raise exception 'guest_coupon_identity_required'; end if;
        select count(*)::int into v_customer_usage_count from public.coupon_redemptions cr where cr.coupon_id=v_coupon_id and cr.guest_identity_hash=v_guest_identity_hash;
      end if;
      if v_customer_usage_count>=v_coupon.per_customer_usage_limit then raise exception 'coupon_customer_limit_reached'; end if;
    end if;
  elsif v_coupon_discount_total<>0 then raise exception 'coupon_snapshot_missing'; end if;

  v_order_number := 'IRTH-' || to_char(clock_timestamp(),'YYYYMMDD') || '-' || upper(substr(replace(v_order_id::text,'-',''),1,8));

  insert into public.orders(id,order_number,market_id,customer_user_id,status,payment_status,currency_code,
    subtotal_before_promotions,promotion_discount_total,coupon_discount_total,merchandise_subtotal,shipping_fee,final_total,
    coupon_id,coupon_code_snapshot,idempotency_scope,idempotency_key,guest_access_token_hash)
  values(v_order_id,v_order_number,v_market_id,v_customer_user_id,'received','pending',v_currency_code,
    v_subtotal_before_promotions,v_promotion_discount_total,v_coupon_discount_total,v_merchandise_subtotal,v_shipping_fee,v_final_total,
    v_coupon_id,v_coupon_code,trim(p_idempotency_scope),trim(p_idempotency_key),nullif(trim(p_guest_access_token_hash),''));

  insert into public.order_customer_details(order_id,recipient_name,email,phone,country_code,administrative_area,city,address_line1,delivery_notes)
  values(v_order_id,trim(p_customer->>'recipientName'),lower(trim(p_customer->>'email')),trim(p_customer->>'phone'),
    upper(trim(p_customer->>'countryCode')),trim(p_customer->>'administrativeArea'),trim(p_customer->>'city'),
    trim(p_customer->>'addressLine1'),nullif(trim(p_customer->>'deliveryNotes'),''));

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    v_unit_price := (v_item->>'unitPrice')::numeric;
    v_original_line_total := (v_item->>'originalLineTotal')::numeric;
    v_promotion_discount := coalesce((v_item->>'promotionDiscount')::numeric,0);
    v_coupon_discount := coalesce((v_item->>'couponDiscount')::numeric,0);
    v_line_total := (v_item->>'lineTotal')::numeric;
    v_promotion_funding_irth := coalesce((v_item->>'promotionFundingIrth')::numeric,0);
    v_promotion_funding_artisan := coalesce((v_item->>'promotionFundingArtisan')::numeric,0);
    v_coupon_funding_irth := coalesce((v_item->>'couponFundingIrth')::numeric,0);
    v_coupon_funding_artisan := coalesce((v_item->>'couponFundingArtisan')::numeric,0);
    v_promotion_id := nullif(v_item->>'promotionId','')::uuid;
    v_customization_text := nullif(trim(coalesce(v_item->>'customizationText','')),'');

    if v_customization_text is not null and char_length(v_customization_text)>500 then raise exception 'invalid_customization_text'; end if;
    if v_quantity<=0 or v_unit_price<0 or v_original_line_total<>v_unit_price*v_quantity or
       v_line_total<>v_original_line_total-v_promotion_discount-v_coupon_discount or
       v_promotion_funding_irth+v_promotion_funding_artisan<>v_promotion_discount or
       v_coupon_funding_irth+v_coupon_funding_artisan<>v_coupon_discount then raise exception 'order_item_totals_changed'; end if;

    select p.id,p.slug,p.name_ar,p.name_en,p.artisan_id,p.primary_craft_id,p.made_to_order,p.quantity as stock_quantity,
      p.lifecycle_status,p.customization,pmp.price as market_price
    into v_product
    from public.products p
    join public.product_market_prices pmp on pmp.product_id=p.id and pmp.market_id=v_market_id and pmp.is_active=true
    join public.artisan_profiles a on a.id=p.artisan_id and a.status='active'
    join public.crafts c on c.id=p.primary_craft_id and c.is_active=true
    join public.countries co on co.id=a.country_id and co.is_active=true
    where p.id=nullif(v_item->>'productId','')::uuid and p.lifecycle_status='published'
    for update of p,pmp;

    if not found or v_product.market_price<>v_unit_price then raise exception 'product_or_price_changed'; end if;
    if v_customization_text is not null and v_product.customization is not true then raise exception 'customization_not_allowed'; end if;

    if v_promotion_id is not null then
      perform 1 from public.promotions pr join public.promotion_products pp on pp.promotion_id=pr.id
      where pr.id=v_promotion_id and pp.product_id=v_product.id and pr.market_id=v_market_id and pr.approval_status='approved'
        and pr.is_enabled=true and now()>=pr.start_at and now()<pr.end_at for share of pr;
      if not found then raise exception 'promotion_changed'; end if;
    elsif v_promotion_discount<>0 then raise exception 'promotion_snapshot_missing'; end if;

    select coalesce(aco.rate_percent,ccr.rate_percent) into v_commission_rate
    from (select 1) base
    left join public.artisan_commission_overrides aco on aco.artisan_id=v_product.artisan_id
    left join public.craft_commission_rates ccr on ccr.craft_id=v_product.primary_craft_id;
    if v_commission_rate is null then raise exception 'commission_not_configured'; end if;

    if not v_product.made_to_order then
      if v_product.stock_quantity is null or v_product.stock_quantity<v_quantity then raise exception 'insufficient_stock'; end if;
      update public.products set quantity=quantity-v_quantity,updated_at=now() where id=v_product.id;
    end if;

    select g.id into v_group_id from public.order_artisan_groups g where g.order_id=v_order_id and g.artisan_id=v_product.artisan_id;
    if not found then insert into public.order_artisan_groups(order_id,artisan_id,fulfillment_status)
      values(v_order_id,v_product.artisan_id,'received') returning id into v_group_id; end if;

    insert into public.order_items(order_id,artisan_group_id,product_id,artisan_id,craft_id,product_slug_snapshot,
      product_name_ar_snapshot,product_name_en_snapshot,quantity,unit_price,original_line_total,promotion_id,
      promotion_discount,promotion_funding_irth,promotion_funding_artisan,coupon_discount,coupon_funding_irth,
      coupon_funding_artisan,line_total,commission_rate_percent,customization_text_snapshot)
    values(v_order_id,v_group_id,v_product.id,v_product.artisan_id,v_product.primary_craft_id,v_product.slug,
      v_product.name_ar,v_product.name_en,v_quantity,v_unit_price,v_original_line_total,v_promotion_id,
      v_promotion_discount,v_promotion_funding_irth,v_promotion_funding_artisan,v_coupon_discount,v_coupon_funding_irth,
      v_coupon_funding_artisan,v_line_total,v_commission_rate,v_customization_text);

    v_sum_original:=v_sum_original+v_original_line_total;
    v_sum_promotion:=v_sum_promotion+v_promotion_discount;
    v_sum_coupon:=v_sum_coupon+v_coupon_discount;
    v_sum_line:=v_sum_line+v_line_total;
  end loop;

  if v_sum_original<>v_subtotal_before_promotions or v_sum_promotion<>v_promotion_discount_total or
     v_sum_coupon<>v_coupon_discount_total or v_sum_line<>v_merchandise_subtotal then raise exception 'order_aggregate_totals_changed'; end if;

  update public.order_artisan_groups g set merchandise_subtotal=totals.subtotal,updated_at=now()
  from (select oi.artisan_group_id,sum(oi.line_total) subtotal from public.order_items oi where oi.order_id=v_order_id group by oi.artisan_group_id) totals
  where g.id=totals.artisan_group_id;

  if v_coupon_id is not null then
    insert into public.coupon_redemptions(coupon_id,customer_user_id,order_id,guest_identity_hash,consumed_at)
    values(v_coupon_id,v_customer_user_id,v_order_id,case when v_customer_user_id is null then v_guest_identity_hash else null end,now());
  end if;

  insert into public.order_status_history(order_id,status,changed_by,source) values(v_order_id,'received',v_customer_user_id,'order_creation');
  return query select v_order_id,v_order_number,false;
end;
$function$;

create or replace function private.build_customer_order_payload(p_order_id uuid)
returns jsonb language sql set search_path to '' as $function$
  select jsonb_build_object(
    'orderId',o.id,'orderNumber',o.order_number,'status',o.status,'paymentStatus',o.payment_status,'currencyCode',o.currency_code,
    'subtotalBeforePromotions',o.subtotal_before_promotions::text,'promotionDiscountTotal',o.promotion_discount_total::text,
    'couponDiscountTotal',o.coupon_discount_total::text,'merchandiseSubtotal',o.merchandise_subtotal::text,
    'shippingFee',o.shipping_fee::text,'finalTotal',o.final_total::text,'couponCode',o.coupon_code_snapshot,'createdAt',o.created_at,
    'items',coalesce((select jsonb_agg(jsonb_build_object('orderItemId',oi.id,'slug',oi.product_slug_snapshot,
      'nameAr',oi.product_name_ar_snapshot,'nameEn',oi.product_name_en_snapshot,'quantity',oi.quantity,'unitPrice',oi.unit_price::text,
      'originalLineTotal',oi.original_line_total::text,'promotionDiscount',oi.promotion_discount::text,'couponDiscount',oi.coupon_discount::text,
      'lineTotal',oi.line_total::text,'customizationText',oi.customization_text_snapshot,'deliveredAt',s.delivered_at,'reviewId',r.id,
      'reviewStatus',r.status,'reviewEditCount',coalesce(r.edit_count,0)) order by oi.created_at,oi.id)
      from public.order_items oi left join public.shipments s on s.artisan_group_id=oi.artisan_group_id
      left join private.customer_reviews r on r.order_item_id=oi.id where oi.order_id=o.id),'[]'::jsonb),
    'timeline',coalesce((select jsonb_agg(jsonb_build_object('status',h.status,'createdAt',h.created_at) order by h.created_at,h.id)
      from public.order_status_history h where h.order_id=o.id),'[]'::jsonb),
    'shipments',coalesce((select jsonb_agg(jsonb_build_object('status',s.status,'courierCode',s.courier_code,
      'trackingNumber',s.tracking_number,'trackingUrl',s.tracking_url,'shippedAt',s.shipped_at,'deliveredAt',s.delivered_at,
      'returnWindowDays',s.return_window_days_snapshot,'returnWindowEndsAt',s.return_window_ends_at,'createdAt',s.created_at)
      order by s.created_at,s.id) from public.shipments s where s.order_id=o.id),'[]'::jsonb))
  from public.orders o where o.id=p_order_id;
$function$;

create or replace function private.get_my_artisan_orders()
returns table(artisan_group_id uuid, order_id uuid, order_number text, order_status text, payment_status text,
  fulfillment_status text, currency_code text, artisan_merchandise_subtotal text, customer_display_name text,
  customer_country_code text, created_at timestamptz, items jsonb)
language sql security definer set search_path to '' as $function$
  select g.id,o.id,o.order_number,o.status,o.payment_status,g.fulfillment_status,o.currency_code,g.merchandise_subtotal::text,
    case when d.recipient_name is null then null else array_to_string((regexp_split_to_array(trim(d.recipient_name),E'\\s+'))[1:2],' ') end,
    d.country_code,o.created_at,coalesce(item_rows.items,'[]'::jsonb)
  from public.order_artisan_groups g join public.orders o on o.id=g.order_id
  join public.artisan_profiles a on a.id=g.artisan_id and a.auth_user_id=(select auth.uid())
  left join public.order_customer_details d on d.order_id=o.id
  left join lateral (select jsonb_agg(jsonb_build_object('id',oi.id,'productSlug',oi.product_slug_snapshot,
    'productNameAr',oi.product_name_ar_snapshot,'productNameEn',oi.product_name_en_snapshot,'quantity',oi.quantity,
    'unitPrice',oi.unit_price::text,'originalLineTotal',oi.original_line_total::text,'promotionDiscount',oi.promotion_discount::text,
    'couponDiscount',oi.coupon_discount::text,'lineTotal',oi.line_total::text,'customizationText',oi.customization_text_snapshot)
    order by oi.created_at,oi.id) items from public.order_items oi where oi.artisan_group_id=g.id and oi.artisan_id=g.artisan_id) item_rows on true
  where (select auth.uid()) is not null order by o.created_at desc,g.id;
$function$;

create or replace function private.get_admin_orders()
returns table(order_id uuid, order_number text, order_status text, payment_status text, currency_code text,
  subtotal_before_promotions text, promotion_discount_total text, coupon_discount_total text, merchandise_subtotal text,
  shipping_fee text, final_total text, customer_recipient_name text, customer_email text, customer_phone text,
  customer_country_code text, customer_administrative_area text, customer_city text, customer_address_line1 text,
  customer_delivery_notes text, created_at timestamptz, artisan_groups jsonb)
language plpgsql security definer set search_path to '' as $function$
begin
  if (select auth.uid()) is null or not (select private.is_super_admin()) then raise exception 'admin_required' using errcode='42501'; end if;
  return query
  select o.id,o.order_number,o.status,o.payment_status,o.currency_code,o.subtotal_before_promotions::text,
    o.promotion_discount_total::text,o.coupon_discount_total::text,o.merchandise_subtotal::text,o.shipping_fee::text,o.final_total::text,
    d.recipient_name,d.email,d.phone,d.country_code,d.administrative_area,d.city,d.address_line1,d.delivery_notes,o.created_at,
    coalesce(group_rows.artisan_groups,'[]'::jsonb)
  from public.orders o left join public.order_customer_details d on d.order_id=o.id
  left join lateral (
    select jsonb_agg(jsonb_build_object('artisanGroupId',g.id,'artisanId',g.artisan_id,'artisanNameAr',a.name_ar,
      'artisanNameEn',a.name_en,'fulfillmentStatus',g.fulfillment_status,'merchandiseSubtotal',g.merchandise_subtotal::text,
      'shipment',case when s.id is null then null else jsonb_build_object('id',s.id,'status',s.status,'courierCode',s.courier_code,
        'trackingNumber',s.tracking_number,'trackingUrl',s.tracking_url,'shippedAt',s.shipped_at,'deliveredAt',s.delivered_at) end,
      'items',coalesce(item_rows.items,'[]'::jsonb)) order by g.created_at,g.id) artisan_groups
    from public.order_artisan_groups g join public.artisan_profiles a on a.id=g.artisan_id
    left join public.shipments s on s.artisan_group_id=g.id
    left join lateral (select jsonb_agg(jsonb_build_object('id',oi.id,'productSlug',oi.product_slug_snapshot,
      'productNameAr',oi.product_name_ar_snapshot,'productNameEn',oi.product_name_en_snapshot,'quantity',oi.quantity,
      'unitPrice',oi.unit_price::text,'originalLineTotal',oi.original_line_total::text,'promotionDiscount',oi.promotion_discount::text,
      'couponDiscount',oi.coupon_discount::text,'lineTotal',oi.line_total::text,'commissionRatePercent',oi.commission_rate_percent::text,
      'customizationText',oi.customization_text_snapshot) order by oi.created_at,oi.id) items
      from public.order_items oi where oi.artisan_group_id=g.id and oi.artisan_id=g.artisan_id) item_rows on true
    where g.order_id=o.id) group_rows on true
  order by o.created_at desc,o.id;
end;
$function$;
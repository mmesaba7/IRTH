create or replace function public.create_customer_return_request(
  p_order_id uuid,
  p_customer_user_id uuid,
  p_items jsonb
)
returns uuid
language sql security definer set search_path='' as $$
  select private.create_return_request_common($1,'authenticated_customer',$2,null,$3);
$$;
revoke all on function public.create_customer_return_request(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.create_customer_return_request(uuid,uuid,jsonb) to service_role;

create or replace function public.get_return_order_context(
  p_order_id uuid,
  p_customer_user_id uuid,
  p_guest_access_token_hash text
)
returns jsonb
language plpgsql security definer set search_path='' stable as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id=p_order_id;
  if not found then return null; end if;
  if p_customer_user_id is not null then
    if v_order.customer_user_id is distinct from p_customer_user_id then return null; end if;
  else
    if v_order.customer_user_id is not null
       or p_guest_access_token_hash is null
       or v_order.guest_access_token_hash is distinct from p_guest_access_token_hash then return null; end if;
  end if;

  return jsonb_build_object(
    'orderId',v_order.id,
    'orderNumber',v_order.order_number,
    'orderStatus',v_order.status,
    'currencyCode',v_order.currency_code,
    'items',coalesce((
      select jsonb_agg(jsonb_build_object(
        'orderItemId',oi.id,
        'productSlug',oi.product_slug_snapshot,
        'productNameAr',oi.product_name_ar_snapshot,
        'productNameEn',oi.product_name_en_snapshot,
        'orderedQuantity',oi.quantity,
        'alreadyRequestedQuantity',coalesce((
          select sum(ri.quantity)::integer
          from private.return_request_items ri
          join private.return_requests rr on rr.id=ri.return_request_id
          where ri.order_item_id=oi.id and rr.status<>'rejected'
        ),0),
        'remainingReturnableQuantity',greatest(0,oi.quantity-coalesce((
          select sum(ri.quantity)::integer
          from private.return_request_items ri
          join private.return_requests rr on rr.id=ri.return_request_id
          where ri.order_item_id=oi.id and rr.status<>'rejected'
        ),0)),
        'deliveredAt',s.delivered_at,
        'returnWindowDays',s.return_window_days_snapshot,
        'returnWindowEndsAt',s.return_window_ends_at,
        'returnWindowOpen',case when s.delivered_at is null or s.return_window_ends_at is null then false else now()<=s.return_window_ends_at end
      ) order by oi.created_at,oi.id)
      from public.order_items oi
      left join public.shipments s on s.artisan_group_id=oi.artisan_group_id
      where oi.order_id=v_order.id
    ),'[]'::jsonb),
    'requests',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',rr.id,
        'status',rr.status,
        'submittedAt',rr.submitted_at,
        'reviewNote',rr.review_note,
        'receivedAt',rr.received_at,
        'inspectedAt',rr.inspected_at,
        'inspectionNote',rr.inspection_note,
        'items',coalesce((
          select jsonb_agg(jsonb_build_object(
            'id',ri.id,
            'orderItemId',ri.order_item_id,
            'productNameAr',oi.product_name_ar_snapshot,
            'productNameEn',oi.product_name_en_snapshot,
            'quantity',ri.quantity,
            'reason',ri.reason_text,
            'restockableQuantity',ri.restockable_quantity
          ) order by ri.created_at,ri.id)
          from private.return_request_items ri
          join public.order_items oi on oi.id=ri.order_item_id
          where ri.return_request_id=rr.id
        ),'[]'::jsonb),
        'refund',case when rf.id is null then null else jsonb_build_object(
          'id',rf.id,'status',rf.status,'merchandiseAmount',rf.merchandise_amount,
          'shippingAmount',rf.shipping_amount,'totalAmount',rf.total_amount,
          'currencyCode',rf.currency_code,'preparedAt',rf.prepared_at,'succeededAt',rf.succeeded_at
        ) end
      ) order by rr.submitted_at desc)
      from private.return_requests rr
      left join private.refunds rf on rf.return_request_id=rr.id
      where rr.order_id=v_order.id
    ),'[]'::jsonb)
  );
end;$$;
revoke all on function public.get_return_order_context(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.get_return_order_context(uuid,uuid,text) to service_role;

create or replace function public.get_customer_return_requests(p_customer_user_id uuid)
returns jsonb
language sql security definer set search_path='' stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',rr.id,'orderId',rr.order_id,'orderNumber',o.order_number,'status',rr.status,
    'submittedAt',rr.submitted_at,'reviewNote',rr.review_note,'receivedAt',rr.received_at,
    'inspectedAt',rr.inspected_at,
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'orderItemId',ri.order_item_id,'productNameAr',oi.product_name_ar_snapshot,
      'productNameEn',oi.product_name_en_snapshot,'quantity',ri.quantity,'reason',ri.reason_text
    )) from private.return_request_items ri join public.order_items oi on oi.id=ri.order_item_id where ri.return_request_id=rr.id),'[]'::jsonb),
    'refund',case when rf.id is null then null else jsonb_build_object('status',rf.status,'totalAmount',rf.total_amount,'currencyCode',rf.currency_code,'succeededAt',rf.succeeded_at) end
  ) order by rr.submitted_at desc),'[]'::jsonb)
  from private.return_requests rr
  join public.orders o on o.id=rr.order_id
  left join private.refunds rf on rf.return_request_id=rr.id
  where rr.customer_user_id=p_customer_user_id;
$$;
revoke all on function public.get_customer_return_requests(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_customer_return_requests(uuid) to service_role;

create or replace function public.get_admin_return_requests(p_admin_user_id uuid)
returns jsonb
language plpgsql security definer set search_path='' stable as $$
begin
  perform private.require_super_admin_user(p_admin_user_id);
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',rr.id,'orderId',rr.order_id,'orderNumber',o.order_number,'requesterKind',rr.requester_kind,
    'status',rr.status,'submittedAt',rr.submitted_at,'reviewNote',rr.review_note,
    'receivedAt',rr.received_at,'inspectedAt',rr.inspected_at,'inspectionNote',rr.inspection_note,
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'returnItemId',ri.id,'orderItemId',ri.order_item_id,'productNameAr',oi.product_name_ar_snapshot,
      'productNameEn',oi.product_name_en_snapshot,'quantity',ri.quantity,'reason',ri.reason_text,
      'restockableQuantity',ri.restockable_quantity
    ) order by ri.created_at,ri.id) from private.return_request_items ri join public.order_items oi on oi.id=ri.order_item_id where ri.return_request_id=rr.id),'[]'::jsonb),
    'refund',case when rf.id is null then null else jsonb_build_object(
      'id',rf.id,'status',rf.status,'merchandiseAmount',rf.merchandise_amount,'shippingAmount',rf.shipping_amount,
      'totalAmount',rf.total_amount,'currencyCode',rf.currency_code,'preparedAt',rf.prepared_at,'succeededAt',rf.succeeded_at,
      'providerCode',rf.provider_code,'providerReference',rf.provider_reference
    ) end
  ) order by case rr.status when 'requested' then 0 when 'approved' then 1 when 'received' then 2 when 'inspected' then 3 when 'refund_pending' then 4 else 5 end,rr.submitted_at desc)
  from private.return_requests rr join public.orders o on o.id=rr.order_id left join private.refunds rf on rf.return_request_id=rr.id),'[]'::jsonb);
end;$$;
revoke all on function public.get_admin_return_requests(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_admin_return_requests(uuid) to service_role;

create or replace function private.set_admin_claim_for_return_action(p_admin_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.require_super_admin_user(p_admin_user_id);
  perform set_config('request.jwt.claim.sub',p_admin_user_id::text,true);
end;$$;
revoke all on function private.set_admin_claim_for_return_action(uuid) from public,anon,authenticated,service_role;

create or replace function public.admin_review_return_request(p_return_request_id uuid,p_admin_user_id uuid,p_decision text,p_note text default null)
returns table(return_request_id uuid,status text,changed boolean)
language plpgsql security definer set search_path='' as $$
begin
  perform private.set_admin_claim_for_return_action(p_admin_user_id);
  return query select * from private.review_return_request(p_return_request_id,p_decision,p_note);
end;$$;
revoke all on function public.admin_review_return_request(uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.admin_review_return_request(uuid,uuid,text,text) to service_role;

create or replace function public.admin_mark_return_received(p_return_request_id uuid,p_admin_user_id uuid)
returns table(return_request_id uuid,status text,changed boolean)
language plpgsql security definer set search_path='' as $$
begin
  perform private.set_admin_claim_for_return_action(p_admin_user_id);
  return query select * from private.mark_return_received(p_return_request_id);
end;$$;
revoke all on function public.admin_mark_return_received(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.admin_mark_return_received(uuid,uuid) to service_role;

create or replace function public.admin_inspect_return_request(p_return_request_id uuid,p_admin_user_id uuid,p_items jsonb,p_note text default null)
returns table(return_request_id uuid,status text,changed boolean)
language plpgsql security definer set search_path='' as $$
begin
  perform private.set_admin_claim_for_return_action(p_admin_user_id);
  return query select * from private.inspect_return_request(p_return_request_id,p_items,p_note);
end;$$;
revoke all on function public.admin_inspect_return_request(uuid,uuid,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.admin_inspect_return_request(uuid,uuid,jsonb,text) to service_role;

create or replace function public.admin_prepare_return_refund(p_return_request_id uuid,p_admin_user_id uuid)
returns table(refund_id uuid,return_request_id uuid,merchandise_amount numeric,shipping_amount numeric,total_amount numeric,changed boolean)
language plpgsql security definer set search_path='' as $$
begin
  perform private.set_admin_claim_for_return_action(p_admin_user_id);
  return query select * from private.prepare_return_refund(p_return_request_id,0);
end;$$;
revoke all on function public.admin_prepare_return_refund(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.admin_prepare_return_refund(uuid,uuid) to service_role;

revoke execute on function public.create_my_return_request(uuid,jsonb) from authenticated;
revoke execute on function public.review_return_request(uuid,text,text) from authenticated;
revoke execute on function public.mark_return_received(uuid) from authenticated;
revoke execute on function public.inspect_return_request(uuid,jsonb,text) from authenticated;
revoke execute on function public.prepare_return_refund(uuid,numeric) from authenticated;

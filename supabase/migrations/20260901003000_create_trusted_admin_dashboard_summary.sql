create or replace function public.get_admin_dashboard_summary(p_admin_user_id uuid)
returns jsonb
language plpgsql security definer set search_path='' stable as $$
begin
  perform private.require_super_admin_user(p_admin_user_id);
  return jsonb_build_object(
    'counts',jsonb_build_object(
      'orders',(select count(*) from public.orders),
      'artisans',(select count(*) from public.artisan_profiles where status='active'),
      'products',(select count(*) from public.products where lifecycle_status='published'),
      'openReturns',(select count(*) from private.return_requests where status in ('requested','approved','received','inspected','refund_pending')),
      'openWholesale',(select count(*) from private.wholesale_requests where not is_closed)
    ),
    'commissionByCurrency',coalesce((
      select jsonb_agg(jsonb_build_object('currencyCode',currency_code,'amount',amount) order by currency_code)
      from (
        select l.currency_code,round(-sum(l.amount),max(l.currency_minor_unit_scale)::integer) amount
        from private.artisan_settlement_ledger l
        where l.entry_type='commission'
        group by l.currency_code
      ) c
    ),'[]'::jsonb),
    'recentOrders',coalesce((
      select jsonb_agg(jsonb_build_object(
        'orderId',o.id,'orderNumber',o.order_number,'status',o.status,'paymentStatus',o.payment_status,
        'currencyCode',o.currency_code,'finalTotal',o.final_total,'createdAt',o.created_at,
        'itemCount',(select count(*) from public.order_items oi where oi.order_id=o.id)
      ) order by o.created_at desc)
      from (select * from public.orders order by created_at desc limit 5) o
    ),'[]'::jsonb)
  );
end;$$;
revoke all on function public.get_admin_dashboard_summary(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_admin_dashboard_summary(uuid) to service_role;

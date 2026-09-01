create or replace function public.get_homepage_best_sellers(p_limit integer default 6)
returns table (
  product_id uuid,
  sold_quantity bigint,
  latest_paid_at timestamptz
)
language sql
security definer
set search_path = ''
as $function$
  select
    oi.product_id,
    sum(oi.quantity)::bigint as sold_quantity,
    max(p.paid_at) as latest_paid_at
  from public.order_items oi
  join private.payments p
    on p.order_id = oi.order_id
  where p.status in ('paid', 'partially_refunded', 'refunded')
    and p.paid_at is not null
    and oi.product_id is not null
  group by oi.product_id
  order by sold_quantity desc, latest_paid_at desc, oi.product_id
  limit greatest(1, least(coalesce(p_limit, 6), 24));
$function$;

revoke all on function public.get_homepage_best_sellers(integer) from public;
revoke all on function public.get_homepage_best_sellers(integer) from anon;
revoke all on function public.get_homepage_best_sellers(integer) from authenticated;
grant execute on function public.get_homepage_best_sellers(integer) to service_role;

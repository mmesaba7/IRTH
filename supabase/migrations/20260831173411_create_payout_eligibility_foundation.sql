-- M5 — Payout Eligibility Foundation
-- Approved 31 August 2026.
-- Eligibility starts from each Artisan Group's own Shipment delivered_at.
-- Return-period duration remains unconfigured until owner approval; missing config fails closed.

alter table public.markets
  add column payout_return_hold_days integer;

alter table public.markets
  add constraint markets_payout_return_hold_days_non_negative
  check (payout_return_hold_days is null or payout_return_hold_days >= 0);

create or replace function private.enforce_return_window_for_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold_days integer;
  v_delivered_at timestamptz;
begin
  select m.payout_return_hold_days, s.delivered_at
  into v_hold_days, v_delivered_at
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.markets m on m.id = o.market_id
  left join public.shipments s on s.artisan_group_id = oi.artisan_group_id
  where oi.id = new.order_item_id;

  if not found then
    raise exception 'return_item_delivery_context_missing';
  end if;

  if v_hold_days is not null
     and v_delivered_at is not null
     and now() > v_delivered_at + make_interval(days => v_hold_days) then
    raise exception 'return_window_closed';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_return_window_for_item()
from public, anon, authenticated, service_role;

create trigger return_request_item_return_window_guard
before insert on private.return_request_items
for each row
execute function private.enforce_return_window_for_item();

create or replace view private.artisan_payout_eligibility
with (security_invoker = true)
as
with ledger_balances as (
  select
    l.order_item_id,
    round(sum(l.amount), max(l.currency_minor_unit_scale)) as current_settlement_amount
  from private.artisan_settlement_ledger l
  group by l.order_item_id
),
return_state as (
  select
    ri.order_item_id,
    bool_or(rr.status in ('requested','approved','received','inspected','refund_pending')) as has_unresolved_return
  from private.return_request_items ri
  join private.return_requests rr on rr.id = ri.return_request_id
  group by ri.order_item_id
)
select
  oi.id as order_item_id,
  oi.order_id,
  oi.artisan_group_id,
  oi.artisan_id,
  s.id as shipment_id,
  s.delivered_at,
  m.payout_return_hold_days as return_hold_days,
  case
    when s.delivered_at is not null and m.payout_return_hold_days is not null
      then s.delivered_at + make_interval(days => m.payout_return_hold_days)
    else null
  end as hold_ends_at,
  p.status as payment_status,
  coalesce(rs.has_unresolved_return, false) as has_unresolved_return,
  coalesce(lb.current_settlement_amount, 0) as current_settlement_amount,
  o.currency_code,
  m.currency_minor_unit_scale,
  case
    when m.payout_return_hold_days is null then 'configuration_missing'
    when s.delivered_at is null then 'not_delivered'
    when p.status not in ('paid','partially_refunded','refunded') then 'payment_not_collected'
    when coalesce(rs.has_unresolved_return, false) then 'return_open'
    when now() < s.delivered_at + make_interval(days => m.payout_return_hold_days) then 'hold_active'
    when coalesce(lb.current_settlement_amount, 0) <= 0 then 'no_positive_balance'
    else 'eligible'
  end as eligibility_status,
  case
    when m.payout_return_hold_days is not null
     and s.delivered_at is not null
     and p.status in ('paid','partially_refunded','refunded')
     and not coalesce(rs.has_unresolved_return, false)
     and now() >= s.delivered_at + make_interval(days => m.payout_return_hold_days)
     and coalesce(lb.current_settlement_amount, 0) > 0
      then s.delivered_at + make_interval(days => m.payout_return_hold_days)
    else null
  end as eligible_at
from public.order_items oi
join public.orders o on o.id = oi.order_id
join public.markets m on m.id = o.market_id
join private.payments p on p.order_id = oi.order_id
left join public.shipments s on s.artisan_group_id = oi.artisan_group_id
left join ledger_balances lb on lb.order_item_id = oi.id
left join return_state rs on rs.order_item_id = oi.id;

revoke all on private.artisan_payout_eligibility from public, anon, authenticated, service_role;
grant select on private.artisan_payout_eligibility to service_role;

create or replace function public.get_payout_eligibility_for_admin(p_artisan_id uuid default null)
returns table(
  order_item_id uuid,
  order_id uuid,
  artisan_group_id uuid,
  artisan_id uuid,
  shipment_id uuid,
  delivered_at timestamptz,
  return_hold_days integer,
  hold_ends_at timestamptz,
  payment_status text,
  has_unresolved_return boolean,
  current_settlement_amount numeric,
  currency_code text,
  currency_minor_unit_scale smallint,
  eligibility_status text,
  eligible_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select
    e.order_item_id, e.order_id, e.artisan_group_id, e.artisan_id,
    e.shipment_id, e.delivered_at, e.return_hold_days, e.hold_ends_at,
    e.payment_status, e.has_unresolved_return, e.current_settlement_amount,
    e.currency_code, e.currency_minor_unit_scale, e.eligibility_status, e.eligible_at
  from private.artisan_payout_eligibility e
  where p_artisan_id is null or e.artisan_id = p_artisan_id
  order by e.delivered_at nulls last, e.order_item_id;
$$;

revoke all on function public.get_payout_eligibility_for_admin(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.get_payout_eligibility_for_admin(uuid) to service_role;

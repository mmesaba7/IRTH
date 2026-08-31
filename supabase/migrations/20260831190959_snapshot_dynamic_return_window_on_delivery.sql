-- Owner-approved dynamic Return Window: 14 days initially, configurable by Super Admin.
-- The active Market value is snapshotted onto each Shipment at delivery so future config changes are not retroactive.

alter table public.shipments
  add column if not exists return_window_days_snapshot integer,
  add column if not exists return_window_ends_at timestamptz;

alter table public.shipments drop constraint if exists shipments_return_window_days_snapshot_nonnegative;
alter table public.shipments add constraint shipments_return_window_days_snapshot_nonnegative
  check (return_window_days_snapshot is null or return_window_days_snapshot >= 0);

alter table public.shipments drop constraint if exists shipments_return_window_snapshot_consistency;
alter table public.shipments add constraint shipments_return_window_snapshot_consistency
  check (
    (delivered_at is null and return_window_days_snapshot is null and return_window_ends_at is null)
    or
    (delivered_at is not null and (
      (return_window_days_snapshot is null and return_window_ends_at is null)
      or
      (return_window_days_snapshot is not null and return_window_ends_at = delivered_at + make_interval(days => return_window_days_snapshot))
    ))
  );

create table if not exists private.market_return_window_history (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  old_days integer,
  new_days integer not null check (new_days >= 0),
  changed_by_user_id uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  reason text
);
create index if not exists market_return_window_history_market_changed_idx
  on private.market_return_window_history(market_id,changed_at desc);
revoke all on table private.market_return_window_history from public,anon,authenticated,service_role;

create or replace function private.snapshot_shipment_return_window()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_days integer;
begin
  if new.delivered_at is not null and (old.delivered_at is null or old.delivered_at is distinct from new.delivered_at) then
    select m.payout_return_hold_days into v_days
    from public.order_artisan_groups g
    join public.orders o on o.id=g.order_id
    join public.markets m on m.id=o.market_id
    where g.id=new.artisan_group_id;
    new.return_window_days_snapshot := v_days;
    new.return_window_ends_at := case when v_days is null then null else new.delivered_at + make_interval(days=>v_days) end;
  elsif old.delivered_at is not null then
    new.return_window_days_snapshot := old.return_window_days_snapshot;
    new.return_window_ends_at := old.return_window_ends_at;
  end if;
  return new;
end;$$;
revoke all on function private.snapshot_shipment_return_window() from public,anon,authenticated,service_role;

drop trigger if exists snapshot_shipment_return_window_trigger on public.shipments;
create trigger snapshot_shipment_return_window_trigger
before update of delivered_at on public.shipments
for each row execute function private.snapshot_shipment_return_window();

create or replace function private.set_market_return_window_days(p_market_id uuid,p_days integer,p_admin_user_id uuid,p_reason text default null)
returns integer language plpgsql security definer set search_path='' as $$
declare v_old integer;
begin
  perform private.require_super_admin_user(p_admin_user_id);
  if p_days is null or p_days < 0 then raise exception 'invalid_return_window_days'; end if;
  select payout_return_hold_days into v_old from public.markets where id=p_market_id for update;
  if not found then raise exception 'market_not_found'; end if;
  if v_old is not distinct from p_days then return v_old; end if;
  update public.markets set payout_return_hold_days=p_days, updated_at=now() where id=p_market_id;
  insert into private.market_return_window_history(market_id,old_days,new_days,changed_by_user_id,reason)
  values(p_market_id,v_old,p_days,p_admin_user_id,nullif(trim(coalesce(p_reason,'')),''));
  return p_days;
end;$$;
create or replace function public.set_market_return_window_days(p_market_id uuid,p_days integer,p_admin_user_id uuid,p_reason text default null)
returns integer language sql security definer set search_path='' as $$ select private.set_market_return_window_days($1,$2,$3,$4); $$;
revoke all on function public.set_market_return_window_days(uuid,integer,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.set_market_return_window_days(uuid,integer,uuid,text) to service_role;

update public.markets
set payout_return_hold_days=14, updated_at=now()
where currency_code='EGP' and payout_return_hold_days is null;

update public.shipments s
set return_window_days_snapshot=m.payout_return_hold_days,
    return_window_ends_at=case when m.payout_return_hold_days is null then null else s.delivered_at + make_interval(days=>m.payout_return_hold_days) end
from public.order_artisan_groups g
join public.orders o on o.id=g.order_id
join public.markets m on m.id=o.market_id
where s.artisan_group_id=g.id
  and s.delivered_at is not null
  and s.return_window_days_snapshot is null;

create or replace function private.enforce_return_window_for_item()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_days integer; v_ends timestamptz; v_delivered timestamptz;
begin
  select s.return_window_days_snapshot,s.return_window_ends_at,s.delivered_at
  into v_days,v_ends,v_delivered
  from public.order_items oi
  left join public.shipments s on s.artisan_group_id=oi.artisan_group_id
  where oi.id=new.order_item_id;
  if not found then raise exception 'return_item_delivery_context_missing'; end if;
  if v_days is not null and v_delivered is not null and now() > v_ends then raise exception 'return_window_closed'; end if;
  return new;
end;$$;

create or replace view private.artisan_payout_eligibility as
with ledger_balances as (
  select l.order_item_id,round(sum(l.amount),max(l.currency_minor_unit_scale)::integer) current_settlement_amount
  from private.artisan_settlement_ledger l group by l.order_item_id
), return_state as (
  select ri.order_item_id,bool_or(rr.status=any(array['requested','approved','received','inspected','refund_pending'])) has_unresolved_return
  from private.return_request_items ri join private.return_requests rr on rr.id=ri.return_request_id group by ri.order_item_id
)
select oi.id order_item_id,oi.order_id,oi.artisan_group_id,oi.artisan_id,s.id shipment_id,s.delivered_at,
       s.return_window_days_snapshot return_hold_days,s.return_window_ends_at hold_ends_at,
       p.status payment_status,coalesce(rs.has_unresolved_return,false) has_unresolved_return,
       coalesce(lb.current_settlement_amount,0::numeric) current_settlement_amount,o.currency_code,m.currency_minor_unit_scale,
       case
         when s.delivered_at is null then 'not_delivered'
         when s.return_window_days_snapshot is null then 'configuration_missing'
         when p.status<>all(array['paid','partially_refunded','refunded']) then 'payment_not_collected'
         when coalesce(rs.has_unresolved_return,false) then 'return_open'
         when now()<s.return_window_ends_at then 'hold_active'
         when coalesce(lb.current_settlement_amount,0::numeric)<=0 then 'no_positive_balance'
         else 'eligible'
       end eligibility_status,
       case when s.delivered_at is not null and s.return_window_days_snapshot is not null
                  and p.status=any(array['paid','partially_refunded','refunded'])
                  and not coalesce(rs.has_unresolved_return,false)
                  and now()>=s.return_window_ends_at
                  and coalesce(lb.current_settlement_amount,0::numeric)>0
            then s.return_window_ends_at else null::timestamptz end eligible_at
from public.order_items oi
join public.orders o on o.id=oi.order_id
join public.markets m on m.id=o.market_id
join private.payments p on p.order_id=oi.order_id
left join public.shipments s on s.artisan_group_id=oi.artisan_group_id
left join ledger_balances lb on lb.order_item_id=oi.id
left join return_state rs on rs.order_item_id=oi.id;

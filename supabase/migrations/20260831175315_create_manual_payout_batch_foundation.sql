-- M6.2 — Manual Bank Transfer Payout Batches
-- Uses M5 eligibility + active verified payout account.
-- Prevents concurrent duplicate reservation and duplicate payout ledger effects.

alter table private.artisan_settlement_ledger
  add constraint artisan_settlement_ledger_payout_entry_sign
    check (entry_type <> 'payout' or amount <= 0),
  add constraint artisan_settlement_ledger_payout_source
    check (entry_type <> 'payout' or source = 'payout_batch');

create table private.payout_batches (
  id uuid primary key,
  batch_number text not null unique,
  idempotency_key text not null,
  status text not null default 'pending',
  method text not null default 'bank_transfer',
  currency_code text not null,
  currency_minor_unit_scale smallint not null,
  total_amount numeric not null,
  item_count integer not null,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  paid_by_user_id uuid references auth.users(id) on delete restrict,
  paid_at timestamptz,
  bank_reference text,
  cancelled_by_user_id uuid references auth.users(id) on delete restrict,
  cancelled_at timestamptz,
  cancel_reason text,
  updated_at timestamptz not null default now(),
  constraint payout_batches_idempotency_key_length check (length(trim(idempotency_key)) between 8 and 200),
  constraint payout_batches_status_values check (status in ('pending','paid','cancelled')),
  constraint payout_batches_method_values check (method in ('bank_transfer')),
  constraint payout_batches_currency_code_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint payout_batches_currency_scale_range check (currency_minor_unit_scale between 0 and 6),
  constraint payout_batches_total_positive check (total_amount > 0),
  constraint payout_batches_total_currency_scale check (total_amount = round(total_amount,currency_minor_unit_scale)),
  constraint payout_batches_item_count_positive check (item_count > 0),
  constraint payout_batches_bank_reference_length check (bank_reference is null or length(trim(bank_reference)) between 3 and 200),
  constraint payout_batches_cancel_reason_length check (cancel_reason is null or length(trim(cancel_reason)) between 3 and 2000),
  constraint payout_batches_state_consistency check (
    (status='pending'
      and paid_by_user_id is null and paid_at is null and bank_reference is null
      and cancelled_by_user_id is null and cancelled_at is null and cancel_reason is null)
    or
    (status='paid'
      and paid_by_user_id is not null and paid_at is not null and bank_reference is not null
      and cancelled_by_user_id is null and cancelled_at is null and cancel_reason is null)
    or
    (status='cancelled'
      and paid_by_user_id is null and paid_at is null and bank_reference is null
      and cancelled_by_user_id is not null and cancelled_at is not null and cancel_reason is not null)
  )
);

create unique index payout_batches_admin_idempotency_unique
  on private.payout_batches(created_by_user_id,idempotency_key);

create index payout_batches_status_created_idx
  on private.payout_batches(status,created_at desc);

create table private.payout_batch_items (
  id uuid primary key default gen_random_uuid(),
  payout_batch_id uuid not null references private.payout_batches(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  artisan_id uuid not null references public.artisan_profiles(id) on delete restrict,
  payout_account_id uuid not null references private.artisan_payout_accounts(id) on delete restrict,
  amount numeric not null,
  currency_code text not null,
  currency_minor_unit_scale smallint not null,
  status text not null default 'reserved',
  ledger_entry_id bigint unique references private.artisan_settlement_ledger(id) on delete restrict,
  paid_at timestamptz,
  released_at timestamptz,
  release_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payout_batch_items_batch_order_unique unique (payout_batch_id,order_item_id),
  constraint payout_batch_items_amount_positive check (amount > 0),
  constraint payout_batch_items_currency_code_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint payout_batch_items_currency_scale_range check (currency_minor_unit_scale between 0 and 6),
  constraint payout_batch_items_amount_currency_scale check (amount = round(amount,currency_minor_unit_scale)),
  constraint payout_batch_items_status_values check (status in ('reserved','paid','released')),
  constraint payout_batch_items_release_reason_length check (release_reason is null or length(trim(release_reason)) between 3 and 1000),
  constraint payout_batch_items_state_consistency check (
    (status='reserved' and ledger_entry_id is null and paid_at is null and released_at is null and release_reason is null)
    or
    (status='paid' and ledger_entry_id is not null and paid_at is not null and released_at is null and release_reason is null)
    or
    (status='released' and ledger_entry_id is null and paid_at is null and released_at is not null and release_reason is not null)
  )
);

create unique index payout_batch_items_one_reserved_per_order_item
  on private.payout_batch_items(order_item_id)
  where status='reserved';

create index payout_batch_items_batch_status_idx
  on private.payout_batch_items(payout_batch_id,status);
create index payout_batch_items_artisan_created_idx
  on private.payout_batch_items(artisan_id,created_at desc);

create table private.payout_batch_events (
  id bigint generated by default as identity primary key,
  payout_batch_id uuid not null references private.payout_batches(id) on delete restrict,
  event_type text not null,
  event_source text not null,
  source_key text not null unique,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint payout_batch_events_type_nonblank check (length(trim(event_type)) >= 3),
  constraint payout_batch_events_source_values check (event_source in ('admin','system')),
  constraint payout_batch_events_source_key_nonblank check (length(trim(source_key)) >= 8),
  constraint payout_batch_events_metadata_object check (jsonb_typeof(metadata)='object')
);

create index payout_batch_events_batch_created_idx
  on private.payout_batch_events(payout_batch_id,created_at);

revoke all on private.payout_batches from public,anon,authenticated,service_role;
revoke all on private.payout_batch_items from public,anon,authenticated,service_role;
revoke all on private.payout_batch_events from public,anon,authenticated,service_role;
revoke all on sequence private.payout_batch_events_id_seq from public,anon,authenticated,service_role;

create or replace function private.prevent_payout_batch_core_mutation()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if old.id is distinct from new.id
     or old.batch_number is distinct from new.batch_number
     or old.idempotency_key is distinct from new.idempotency_key
     or old.method is distinct from new.method
     or old.currency_code is distinct from new.currency_code
     or old.currency_minor_unit_scale is distinct from new.currency_minor_unit_scale
     or old.total_amount is distinct from new.total_amount
     or old.item_count is distinct from new.item_count
     or old.created_by_user_id is distinct from new.created_by_user_id
     or old.created_at is distinct from new.created_at then
    raise exception 'payout_batch_core_fields_are_immutable';
  end if;
  return new;
end;
$$;
revoke all on function private.prevent_payout_batch_core_mutation() from public,anon,authenticated,service_role;
create trigger payout_batches_core_immutable
before update on private.payout_batches
for each row execute function private.prevent_payout_batch_core_mutation();

create or replace function private.prevent_payout_batch_item_core_mutation()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if old.payout_batch_id is distinct from new.payout_batch_id
     or old.order_item_id is distinct from new.order_item_id
     or old.artisan_id is distinct from new.artisan_id
     or old.payout_account_id is distinct from new.payout_account_id
     or old.amount is distinct from new.amount
     or old.currency_code is distinct from new.currency_code
     or old.currency_minor_unit_scale is distinct from new.currency_minor_unit_scale
     or old.created_at is distinct from new.created_at then
    raise exception 'payout_batch_item_financial_fields_are_immutable';
  end if;
  return new;
end;
$$;
revoke all on function private.prevent_payout_batch_item_core_mutation() from public,anon,authenticated,service_role;
create trigger payout_batch_items_core_immutable
before update on private.payout_batch_items
for each row execute function private.prevent_payout_batch_item_core_mutation();

create or replace function private.prevent_payout_batch_event_mutation()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  raise exception 'payout_batch_events_are_append_only';
end;
$$;
revoke all on function private.prevent_payout_batch_event_mutation() from public,anon,authenticated,service_role;
create trigger payout_batch_events_append_only
before update or delete on private.payout_batch_events
for each row execute function private.prevent_payout_batch_event_mutation();

create or replace view private.artisan_payout_availability
with (security_invoker=true)
as
select
  e.*,
  r.payout_batch_id as reserved_payout_batch_id,
  case when r.payout_batch_id is not null then 'reserved_for_payout' else e.eligibility_status end as payout_availability_status
from private.artisan_payout_eligibility e
left join private.payout_batch_items r
  on r.order_item_id=e.order_item_id and r.status='reserved';

revoke all on private.artisan_payout_availability from public,anon,authenticated,service_role;

create or replace function private.create_manual_payout_batch(
  p_order_item_ids uuid[],
  p_admin_user_id uuid,
  p_idempotency_key text
)
returns table(batch_id uuid,batch_number text,total_amount numeric,item_count integer,changed boolean)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_existing private.payout_batches%rowtype;
  v_existing_ids uuid[];
  v_sorted_ids uuid[];
  v_distinct_count integer;
  v_input_count integer;
  v_order_item_id uuid;
  v_elig record;
  v_account_id uuid;
  v_currency text;
  v_scale smallint;
  v_total numeric := 0;
  v_batch_id uuid := gen_random_uuid();
  v_batch_number text;
  v_now timestamptz := now();
begin
  if p_admin_user_id is null or not private.is_super_admin_user(p_admin_user_id) then
    raise exception 'admin_required' using errcode='42501';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) not between 8 and 200 then
    raise exception 'invalid_payout_idempotency_key';
  end if;
  if p_order_item_ids is null or cardinality(p_order_item_ids)=0 or cardinality(p_order_item_ids)>500 then
    raise exception 'invalid_payout_order_items';
  end if;

  select count(*),count(distinct u.order_item_id),array_agg(u.order_item_id order by u.order_item_id)
  into v_input_count,v_distinct_count,v_sorted_ids
  from unnest(p_order_item_ids) as u(order_item_id);
  if v_input_count<>v_distinct_count or exists(select 1 from unnest(p_order_item_ids) x where x is null) then
    raise exception 'duplicate_or_null_payout_order_item';
  end if;

  select b.* into v_existing
  from private.payout_batches b
  where b.created_by_user_id=p_admin_user_id and b.idempotency_key=p_idempotency_key
  for update;
  if found then
    select array_agg(i.order_item_id order by i.order_item_id) into v_existing_ids
    from private.payout_batch_items i where i.payout_batch_id=v_existing.id;
    if v_existing_ids is distinct from v_sorted_ids then
      raise exception 'payout_idempotency_key_reused_with_different_items';
    end if;
    return query select v_existing.id,v_existing.batch_number,v_existing.total_amount,v_existing.item_count,false;
    return;
  end if;

  for v_order_item_id in select u.order_item_id from unnest(v_sorted_ids) as u(order_item_id)
  loop
    perform 1 from public.order_items oi where oi.id=v_order_item_id for update;
    if not found then raise exception 'payout_order_item_not_found'; end if;

    select e.* into v_elig from private.artisan_payout_eligibility e where e.order_item_id=v_order_item_id;
    if not found then raise exception 'payout_eligibility_context_missing'; end if;
    if v_elig.eligibility_status<>'eligible' then
      raise exception 'payout_item_not_eligible:%',v_elig.eligibility_status;
    end if;

    if exists(select 1 from private.payout_batch_items i where i.order_item_id=v_order_item_id and i.status='reserved') then
      raise exception 'payout_item_already_reserved';
    end if;

    select a.id into v_account_id
    from private.artisan_payout_accounts a
    where a.artisan_id=v_elig.artisan_id and a.method='bank_transfer' and a.status='active'
    for share;
    if not found then raise exception 'active_verified_payout_account_required'; end if;

    if v_currency is null then
      v_currency:=v_elig.currency_code;
      v_scale:=v_elig.currency_minor_unit_scale;
    elsif v_currency<>v_elig.currency_code or v_scale<>v_elig.currency_minor_unit_scale then
      raise exception 'payout_batch_currency_mismatch';
    end if;

    v_total:=round(v_total+v_elig.current_settlement_amount,v_scale);
  end loop;

  if v_total<=0 then raise exception 'payout_batch_total_must_be_positive'; end if;
  v_batch_number:='IRTH-PAYOUT-'||to_char(v_now,'YYYYMMDD')||'-'||upper(substr(replace(v_batch_id::text,'-',''),1,8));

  insert into private.payout_batches(
    id,batch_number,idempotency_key,status,method,currency_code,currency_minor_unit_scale,
    total_amount,item_count,created_by_user_id,created_at,updated_at
  ) values (
    v_batch_id,v_batch_number,trim(p_idempotency_key),'pending','bank_transfer',v_currency,v_scale,
    v_total,v_input_count,p_admin_user_id,v_now,v_now
  );

  for v_order_item_id in select u.order_item_id from unnest(v_sorted_ids) as u(order_item_id)
  loop
    select e.* into v_elig from private.artisan_payout_eligibility e where e.order_item_id=v_order_item_id;
    select a.id into v_account_id
    from private.artisan_payout_accounts a
    where a.artisan_id=v_elig.artisan_id and a.method='bank_transfer' and a.status='active';

    insert into private.payout_batch_items(
      payout_batch_id,order_item_id,artisan_id,payout_account_id,amount,
      currency_code,currency_minor_unit_scale,status
    ) values (
      v_batch_id,v_order_item_id,v_elig.artisan_id,v_account_id,v_elig.current_settlement_amount,
      v_elig.currency_code,v_elig.currency_minor_unit_scale,'reserved'
    );
  end loop;

  insert into private.payout_batch_events(
    payout_batch_id,event_type,event_source,source_key,actor_user_id,metadata
  ) values (
    v_batch_id,'payout_batch_created','admin','payout-batch-created:'||v_batch_id::text,
    p_admin_user_id,jsonb_build_object('item_count',v_input_count,'total_amount',v_total,'currency_code',v_currency)
  );

  return query select v_batch_id,v_batch_number,v_total,v_input_count,true;
end;
$$;
revoke all on function private.create_manual_payout_batch(uuid[],uuid,text) from public,anon,authenticated,service_role;

create or replace function public.create_manual_payout_batch(
  p_order_item_ids uuid[],p_admin_user_id uuid,p_idempotency_key text
)
returns table(batch_id uuid,batch_number text,total_amount numeric,item_count integer,changed boolean)
language sql
security definer
set search_path=''
as $$ select * from private.create_manual_payout_batch(p_order_item_ids,p_admin_user_id,p_idempotency_key); $$;
revoke all on function public.create_manual_payout_batch(uuid[],uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.create_manual_payout_batch(uuid[],uuid,text) to service_role;

create or replace function private.cancel_manual_payout_batch(
  p_batch_id uuid,p_admin_user_id uuid,p_reason text
)
returns table(batch_id uuid,status text,changed boolean)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_batch private.payout_batches%rowtype;
  v_now timestamptz:=now();
begin
  if p_admin_user_id is null or not private.is_super_admin_user(p_admin_user_id) then raise exception 'admin_required' using errcode='42501'; end if;
  if p_reason is null or length(trim(p_reason)) not between 3 and 2000 then raise exception 'invalid_payout_cancel_reason'; end if;

  select b.* into v_batch from private.payout_batches b where b.id=p_batch_id for update;
  if not found then raise exception 'payout_batch_not_found'; end if;
  if v_batch.status='cancelled' then return query select v_batch.id,v_batch.status,false; return; end if;
  if v_batch.status<>'pending' then raise exception 'paid_payout_batch_cannot_be_cancelled'; end if;

  update private.payout_batch_items i
  set status='released',released_at=v_now,release_reason='batch_cancelled',updated_at=v_now
  where i.payout_batch_id=v_batch.id and i.status='reserved';

  update private.payout_batches b
  set status='cancelled',cancelled_by_user_id=p_admin_user_id,cancelled_at=v_now,
      cancel_reason=trim(p_reason),updated_at=v_now
  where b.id=v_batch.id;

  insert into private.payout_batch_events(payout_batch_id,event_type,event_source,source_key,actor_user_id,metadata)
  values(v_batch.id,'payout_batch_cancelled','admin','payout-batch-cancelled:'||v_batch.id::text,
         p_admin_user_id,jsonb_build_object('reason',trim(p_reason)));

  return query select v_batch.id,'cancelled'::text,true;
end;
$$;
revoke all on function private.cancel_manual_payout_batch(uuid,uuid,text) from public,anon,authenticated,service_role;

create or replace function public.cancel_manual_payout_batch(p_batch_id uuid,p_admin_user_id uuid,p_reason text)
returns table(batch_id uuid,status text,changed boolean)
language sql
security definer
set search_path=''
as $$ select * from private.cancel_manual_payout_batch(p_batch_id,p_admin_user_id,p_reason); $$;
revoke all on function public.cancel_manual_payout_batch(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.cancel_manual_payout_batch(uuid,uuid,text) to service_role;

create or replace function private.record_manual_payout_batch_paid(
  p_batch_id uuid,p_admin_user_id uuid,p_bank_reference text
)
returns table(batch_id uuid,status text,total_amount numeric,changed boolean)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_batch private.payout_batches%rowtype;
  v_item private.payout_batch_items%rowtype;
  v_elig record;
  v_ledger_id bigint;
  v_now timestamptz:=now();
begin
  if p_admin_user_id is null or not private.is_super_admin_user(p_admin_user_id) then raise exception 'admin_required' using errcode='42501'; end if;
  if p_bank_reference is null or length(trim(p_bank_reference)) not between 3 and 200 then raise exception 'invalid_bank_transfer_reference'; end if;

  select b.* into v_batch from private.payout_batches b where b.id=p_batch_id for update;
  if not found then raise exception 'payout_batch_not_found'; end if;

  if v_batch.status='paid' then
    if v_batch.bank_reference is distinct from trim(p_bank_reference) then raise exception 'payout_reference_mismatch'; end if;
    return query select v_batch.id,v_batch.status,v_batch.total_amount,false;
    return;
  end if;
  if v_batch.status<>'pending' then raise exception 'payout_batch_not_payable'; end if;

  for v_item in
    select i.* from private.payout_batch_items i
    where i.payout_batch_id=v_batch.id
    order by i.order_item_id
    for update
  loop
    if v_item.status<>'reserved' then raise exception 'payout_batch_item_not_reserved'; end if;
    perform 1 from public.order_items oi where oi.id=v_item.order_item_id for update;

    select e.* into v_elig from private.artisan_payout_eligibility e where e.order_item_id=v_item.order_item_id;
    if not found or v_elig.eligibility_status<>'eligible' then
      raise exception 'payout_item_no_longer_eligible';
    end if;
    if v_elig.current_settlement_amount<>v_item.amount then
      raise exception 'payout_item_balance_changed_rebuild_batch';
    end if;
    if v_elig.currency_code<>v_item.currency_code or v_elig.currency_minor_unit_scale<>v_item.currency_minor_unit_scale then
      raise exception 'payout_item_currency_changed';
    end if;

    insert into private.artisan_settlement_ledger(
      entry_key,order_id,order_item_id,artisan_group_id,artisan_id,
      currency_code,currency_minor_unit_scale,entry_type,amount,
      calculation_base_amount,rate_percent,source,reason,reference_code,
      recorded_by_user_id,effective_at
    )
    select
      'payout:'||v_item.id::text,
      oi.order_id,oi.id,oi.artisan_group_id,oi.artisan_id,
      v_item.currency_code,v_item.currency_minor_unit_scale,'payout',-v_item.amount,
      null,null,'payout_batch','manual_bank_transfer',v_batch.batch_number,
      p_admin_user_id,v_now
    from public.order_items oi where oi.id=v_item.order_item_id
    returning id into v_ledger_id;

    update private.payout_batch_items i
    set status='paid',ledger_entry_id=v_ledger_id,paid_at=v_now,updated_at=v_now
    where i.id=v_item.id;
  end loop;

  if (select count(*) from private.payout_batch_items i where i.payout_batch_id=v_batch.id and i.status='paid')<>v_batch.item_count then
    raise exception 'payout_batch_paid_item_count_mismatch';
  end if;
  if (select round(sum(i.amount),v_batch.currency_minor_unit_scale) from private.payout_batch_items i where i.payout_batch_id=v_batch.id and i.status='paid')<>v_batch.total_amount then
    raise exception 'payout_batch_paid_total_mismatch';
  end if;

  update private.payout_batches b
  set status='paid',paid_by_user_id=p_admin_user_id,paid_at=v_now,
      bank_reference=trim(p_bank_reference),updated_at=v_now
  where b.id=v_batch.id;

  insert into private.payout_batch_events(payout_batch_id,event_type,event_source,source_key,actor_user_id,metadata)
  values(v_batch.id,'payout_batch_paid','admin','payout-batch-paid:'||v_batch.id::text,
         p_admin_user_id,jsonb_build_object('bank_reference',trim(p_bank_reference),'total_amount',v_batch.total_amount));

  return query select v_batch.id,'paid'::text,v_batch.total_amount,true;
end;
$$;
revoke all on function private.record_manual_payout_batch_paid(uuid,uuid,text) from public,anon,authenticated,service_role;

create or replace function public.record_manual_payout_batch_paid(p_batch_id uuid,p_admin_user_id uuid,p_bank_reference text)
returns table(batch_id uuid,status text,total_amount numeric,changed boolean)
language sql
security definer
set search_path=''
as $$ select * from private.record_manual_payout_batch_paid(p_batch_id,p_admin_user_id,p_bank_reference); $$;
revoke all on function public.record_manual_payout_batch_paid(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.record_manual_payout_batch_paid(uuid,uuid,text) to service_role;

create or replace function public.get_payout_availability_for_admin(p_admin_user_id uuid,p_artisan_id uuid default null)
returns table(
  order_item_id uuid,order_id uuid,artisan_id uuid,shipment_id uuid,delivered_at timestamptz,
  hold_ends_at timestamptz,payment_status text,current_settlement_amount numeric,currency_code text,
  eligibility_status text,payout_availability_status text,reserved_payout_batch_id uuid
)
language plpgsql
security definer
set search_path=''
as $$
begin
  if p_admin_user_id is null or not private.is_super_admin_user(p_admin_user_id) then raise exception 'admin_required' using errcode='42501'; end if;
  return query
  select a.order_item_id,a.order_id,a.artisan_id,a.shipment_id,a.delivered_at,a.hold_ends_at,
         a.payment_status,a.current_settlement_amount,a.currency_code,a.eligibility_status,
         a.payout_availability_status,a.reserved_payout_batch_id
  from private.artisan_payout_availability a
  where p_artisan_id is null or a.artisan_id=p_artisan_id
  order by a.delivered_at nulls last,a.order_item_id;
end;
$$;
revoke all on function public.get_payout_availability_for_admin(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_payout_availability_for_admin(uuid,uuid) to service_role;

create or replace function public.get_payout_batches_for_admin(p_admin_user_id uuid,p_batch_id uuid default null)
returns table(
  batch_id uuid,batch_number text,status text,method text,currency_code text,total_amount numeric,item_count integer,
  created_at timestamptz,paid_at timestamptz,bank_reference text,cancelled_at timestamptz,cancel_reason text
)
language plpgsql
security definer
set search_path=''
as $$
begin
  if p_admin_user_id is null or not private.is_super_admin_user(p_admin_user_id) then raise exception 'admin_required' using errcode='42501'; end if;
  return query
  select b.id,b.batch_number,b.status,b.method,b.currency_code,b.total_amount,b.item_count,
         b.created_at,b.paid_at,b.bank_reference,b.cancelled_at,b.cancel_reason
  from private.payout_batches b
  where p_batch_id is null or b.id=p_batch_id
  order by b.created_at desc;
end;
$$;
revoke all on function public.get_payout_batches_for_admin(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_payout_batches_for_admin(uuid,uuid) to service_role;

create or replace function public.get_payout_batch_items_for_admin(p_admin_user_id uuid,p_batch_id uuid)
returns table(
  payout_batch_item_id uuid,order_item_id uuid,artisan_id uuid,payout_account_id uuid,
  amount numeric,currency_code text,status text,ledger_entry_id bigint,
  account_details_ciphertext text,account_encryption_key_version integer
)
language plpgsql
security definer
set search_path=''
as $$
begin
  if p_admin_user_id is null or not private.is_super_admin_user(p_admin_user_id) then raise exception 'admin_required' using errcode='42501'; end if;
  return query
  select i.id,i.order_item_id,i.artisan_id,i.payout_account_id,i.amount,i.currency_code,i.status,i.ledger_entry_id,
         a.details_ciphertext,a.encryption_key_version
  from private.payout_batch_items i
  join private.artisan_payout_accounts a on a.id=i.payout_account_id
  where i.payout_batch_id=p_batch_id
  order by i.artisan_id,i.order_item_id;
end;
$$;
revoke all on function public.get_payout_batch_items_for_admin(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_payout_batch_items_for_admin(uuid,uuid) to service_role;

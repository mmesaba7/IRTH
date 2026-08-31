create table if not exists private.customer_account_controls (
  customer_user_id uuid primary key references auth.users(id) on delete cascade,
  is_suspended boolean not null default false,
  suspension_reason text null,
  suspended_at timestamptz null,
  suspended_by_user_id uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint customer_account_controls_reason_length check (suspension_reason is null or char_length(suspension_reason) between 1 and 1000),
  constraint customer_account_controls_suspension_consistency check (
    (is_suspended = true and suspended_at is not null and suspended_by_user_id is not null)
    or
    (is_suspended = false and suspended_at is null and suspended_by_user_id is null and suspension_reason is null)
  )
);

create table if not exists private.customer_account_status_events (
  id bigint generated always as identity primary key,
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  is_suspended boolean not null,
  reason text null,
  changed_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint customer_account_status_events_reason_length check (reason is null or char_length(reason) between 1 and 1000)
);

create table if not exists private.customer_support_notes (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint customer_support_notes_length check (char_length(note) between 1 and 2000)
);

create index if not exists customer_account_controls_suspended_by_idx on private.customer_account_controls(suspended_by_user_id);
create index if not exists customer_account_status_events_customer_created_idx on private.customer_account_status_events(customer_user_id, created_at desc);
create index if not exists customer_account_status_events_changed_by_idx on private.customer_account_status_events(changed_by_user_id);
create index if not exists customer_support_notes_customer_created_idx on private.customer_support_notes(customer_user_id, created_at desc);
create index if not exists customer_support_notes_created_by_idx on private.customer_support_notes(created_by_user_id);

revoke all on private.customer_account_controls from public, anon, authenticated, service_role;
revoke all on private.customer_account_status_events from public, anon, authenticated, service_role;
revoke all on private.customer_support_notes from public, anon, authenticated, service_role;

create or replace function private.require_customer_role_user(p_user_id uuid)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  if p_user_id is null or not exists (
    select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id
    where ur.user_id=p_user_id and r.code='customer'
  ) then raise exception 'customer_not_found'; end if;
end;$function$;

create or replace function public.get_admin_customers(p_admin_user_id uuid)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_result jsonb;
begin
  perform private.require_super_admin_user(p_admin_user_id);
  select jsonb_build_object('customers',coalesce(jsonb_agg(jsonb_build_object(
    'userId',u.id,'email',u.email,'createdAt',u.created_at,'lastSignInAt',u.last_sign_in_at,
    'isSuspended',coalesce(cac.is_suspended,false),'suspensionReason',cac.suspension_reason,'suspendedAt',cac.suspended_at,
    'orders',coalesce((select jsonb_agg(jsonb_build_object('orderId',o.id,'orderNumber',o.order_number,'status',o.status,
      'paymentStatus',o.payment_status,'currencyCode',o.currency_code,'finalTotal',o.final_total::text,'createdAt',o.created_at)
      order by o.created_at desc,o.id) from public.orders o where o.customer_user_id=u.id),'[]'::jsonb),
    'supportNotes',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'note',n.note,'createdAt',n.created_at,
      'createdByUserId',n.created_by_user_id) order by n.created_at desc,n.id) from private.customer_support_notes n
      where n.customer_user_id=u.id),'[]'::jsonb),
    'statusHistory',coalesce((select jsonb_agg(jsonb_build_object('isSuspended',e.is_suspended,'reason',e.reason,
      'changedByUserId',e.changed_by_user_id,'createdAt',e.created_at) order by e.created_at desc,e.id desc)
      from private.customer_account_status_events e where e.customer_user_id=u.id),'[]'::jsonb)
  ) order by u.created_at desc,u.id),'[]'::jsonb)) into v_result
  from auth.users u join public.user_roles ur on ur.user_id=u.id join public.roles r on r.id=ur.role_id and r.code='customer'
  left join private.customer_account_controls cac on cac.customer_user_id=u.id;
  return coalesce(v_result,jsonb_build_object('customers','[]'::jsonb));
end;$function$;

create or replace function public.record_admin_customer_suspension_state(
  p_customer_user_id uuid,p_is_suspended boolean,p_admin_user_id uuid,p_reason text default null
) returns void language plpgsql security definer set search_path to '' as $function$
declare v_reason text:=nullif(trim(coalesce(p_reason,'')),''); v_now timestamptz:=now();
begin
  perform private.require_super_admin_user(p_admin_user_id);
  perform private.require_customer_role_user(p_customer_user_id);
  if p_is_suspended is null then raise exception 'invalid_suspension_state'; end if;
  if v_reason is not null and char_length(v_reason)>1000 then raise exception 'invalid_suspension_reason'; end if;
  if p_is_suspended and v_reason is null then raise exception 'suspension_reason_required'; end if;
  insert into private.customer_account_controls(customer_user_id,is_suspended,suspension_reason,suspended_at,suspended_by_user_id,updated_at)
  values(p_customer_user_id,p_is_suspended,case when p_is_suspended then v_reason else null end,
    case when p_is_suspended then v_now else null end,case when p_is_suspended then p_admin_user_id else null end,v_now)
  on conflict(customer_user_id) do update set is_suspended=excluded.is_suspended,suspension_reason=excluded.suspension_reason,
    suspended_at=excluded.suspended_at,suspended_by_user_id=excluded.suspended_by_user_id,updated_at=excluded.updated_at;
  insert into private.customer_account_status_events(customer_user_id,is_suspended,reason,changed_by_user_id,created_at)
  values(p_customer_user_id,p_is_suspended,v_reason,p_admin_user_id,v_now);
end;$function$;

create or replace function public.add_admin_customer_support_note(p_customer_user_id uuid,p_note text,p_admin_user_id uuid)
returns uuid language plpgsql security definer set search_path to '' as $function$
declare v_note text:=trim(coalesce(p_note,'')); v_id uuid;
begin
  perform private.require_super_admin_user(p_admin_user_id);
  perform private.require_customer_role_user(p_customer_user_id);
  if char_length(v_note) not between 1 and 2000 then raise exception 'invalid_support_note'; end if;
  insert into private.customer_support_notes(customer_user_id,note,created_by_user_id)
  values(p_customer_user_id,v_note,p_admin_user_id) returning id into v_id;
  return v_id;
end;$function$;

revoke all on function public.get_admin_customers(uuid) from public,anon,authenticated;
revoke all on function public.record_admin_customer_suspension_state(uuid,boolean,uuid,text) from public,anon,authenticated;
revoke all on function public.add_admin_customer_support_note(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.get_admin_customers(uuid) to service_role;
grant execute on function public.record_admin_customer_suspension_state(uuid,boolean,uuid,text) to service_role;
grant execute on function public.add_admin_customer_support_note(uuid,text,uuid) to service_role;
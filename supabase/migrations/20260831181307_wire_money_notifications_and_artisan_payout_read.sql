-- M7.1/M7.4 — Secure payout read model + Money notification wiring
-- No new money source of truth is created here. Reads derive from M5/M6 trusted state.
-- Notifications are emitted from existing append-only financial/return/payout events.

create or replace function private.get_artisan_payout_dashboard(
  p_artisan_id uuid,
  p_requester_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_artisan_payout_requester(p_artisan_id, p_requester_user_id);

  return jsonb_build_object(
    'summaryByCurrency', coalesce((
      select jsonb_agg(jsonb_build_object(
        'currencyCode', s.currency_code,
        'currentOutstandingAmount', s.current_outstanding_amount,
        'availableForPayoutAmount', s.available_for_payout_amount,
        'reservedForPayoutAmount', s.reserved_for_payout_amount,
        'paidAmount', coalesce(p.paid_amount, 0)
      ) order by s.currency_code)
      from (
        select
          a.currency_code,
          round(sum(greatest(a.current_settlement_amount, 0)), max(a.currency_minor_unit_scale)) as current_outstanding_amount,
          round(sum(case when a.payout_availability_status = 'eligible' then greatest(a.current_settlement_amount, 0) else 0 end), max(a.currency_minor_unit_scale)) as available_for_payout_amount,
          round(sum(case when a.payout_availability_status = 'reserved_for_payout' then greatest(a.current_settlement_amount, 0) else 0 end), max(a.currency_minor_unit_scale)) as reserved_for_payout_amount
        from private.artisan_payout_availability a
        where a.artisan_id = p_artisan_id
        group by a.currency_code
      ) s
      left join (
        select
          i.currency_code,
          round(sum(i.amount), max(i.currency_minor_unit_scale)) as paid_amount
        from private.payout_batch_items i
        where i.artisan_id = p_artisan_id
          and i.status = 'paid'
        group by i.currency_code
      ) p on p.currency_code = s.currency_code
    ), '[]'::jsonb),
    'earnings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'orderItemId', a.order_item_id,
        'orderId', a.order_id,
        'orderNumber', o.order_number,
        'shipmentId', a.shipment_id,
        'deliveredAt', a.delivered_at,
        'holdEndsAt', a.hold_ends_at,
        'paymentStatus', a.payment_status,
        'currentSettlementAmount', a.current_settlement_amount,
        'currencyCode', a.currency_code,
        'eligibilityStatus', a.eligibility_status,
        'payoutAvailabilityStatus', a.payout_availability_status,
        'eligibleAt', a.eligible_at,
        'latestPayoutBatchNumber', pb.batch_number,
        'latestPayoutItemStatus', pb.item_status,
        'latestPayoutAmount', pb.amount,
        'latestPayoutPaidAt', pb.paid_at
      ) order by coalesce(a.delivered_at, o.created_at) desc, a.order_item_id desc)
      from private.artisan_payout_availability a
      join public.orders o on o.id = a.order_id
      left join lateral (
        select
          b.batch_number,
          i.status as item_status,
          i.amount,
          b.paid_at,
          i.created_at
        from private.payout_batch_items i
        join private.payout_batches b on b.id = i.payout_batch_id
        where i.order_item_id = a.order_item_id
          and i.artisan_id = p_artisan_id
        order by i.created_at desc, i.id desc
        limit 1
      ) pb on true
      where a.artisan_id = p_artisan_id
    ), '[]'::jsonb),
    'payouts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'batchId', x.batch_id,
        'batchNumber', x.batch_number,
        'status', x.status,
        'currencyCode', x.currency_code,
        'amount', x.amount,
        'createdAt', x.created_at,
        'paidAt', x.paid_at,
        'cancelledAt', x.cancelled_at
      ) order by x.created_at desc, x.batch_id desc)
      from (
        select
          b.id as batch_id,
          b.batch_number,
          b.status,
          b.currency_code,
          round(sum(i.amount), b.currency_minor_unit_scale) as amount,
          b.created_at,
          b.paid_at,
          b.cancelled_at
        from private.payout_batch_items i
        join private.payout_batches b on b.id = i.payout_batch_id
        where i.artisan_id = p_artisan_id
        group by b.id, b.batch_number, b.status, b.currency_code,
                 b.currency_minor_unit_scale, b.created_at, b.paid_at, b.cancelled_at
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function private.get_artisan_payout_dashboard(uuid,uuid)
from public, anon, authenticated, service_role;

create or replace function public.get_artisan_payout_dashboard(
  p_artisan_id uuid,
  p_requester_user_id uuid
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.get_artisan_payout_dashboard(p_artisan_id,p_requester_user_id);
$$;

revoke all on function public.get_artisan_payout_dashboard(uuid,uuid)
from public, anon, authenticated, service_role;
grant execute on function public.get_artisan_payout_dashboard(uuid,uuid) to service_role;

create or replace function private.notify_artisan_money_event(
  p_artisan_id uuid,
  p_event_key text,
  p_title_ar text,
  p_title_en text,
  p_body_ar text,
  p_body_en text,
  p_link_path text,
  p_source_type text,
  p_source_id uuid,
  p_dedupe_suffix text,
  p_send_email boolean default false,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_email text;
  v_payload jsonb := coalesce(p_payload,'{}'::jsonb) || jsonb_build_object('audience','artisan');
begin
  select ap.auth_user_id, u.email
  into v_user_id, v_email
  from public.artisan_profiles ap
  left join auth.users u on u.id = ap.auth_user_id
  where ap.id = p_artisan_id;

  if not found or v_user_id is null then return; end if;

  perform private.emit_notification(
    v_user_id,p_event_key,p_title_ar,p_title_en,p_body_ar,p_body_en,
    p_link_path,p_source_type,p_source_id,
    format('inapp:artisan:%s:%s',v_user_id,p_dedupe_suffix)
  );

  if p_send_email and v_email is not null and trim(v_email) <> '' then
    perform private.enqueue_notification_email(
      p_event_key,v_email,'auto',p_event_key,v_payload,
      p_source_type,p_source_id,
      format('email:artisan:%s:%s',v_user_id,p_dedupe_suffix)
    );
  end if;
end;
$$;

revoke all on function private.notify_artisan_money_event(uuid,text,text,text,text,text,text,text,uuid,text,boolean,jsonb)
from public, anon, authenticated, service_role;

create or replace function private.notify_super_admins_money_event(
  p_event_key text,
  p_title_ar text,
  p_title_en text,
  p_body_ar text,
  p_body_en text,
  p_link_path text,
  p_source_type text,
  p_source_id uuid,
  p_dedupe_suffix text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin record;
begin
  for v_admin in
    select distinct ur.user_id
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where r.code = 'super_admin'
  loop
    perform private.emit_notification(
      v_admin.user_id,p_event_key,p_title_ar,p_title_en,p_body_ar,p_body_en,
      p_link_path,p_source_type,p_source_id,
      format('inapp:admin:%s:%s',v_admin.user_id,p_dedupe_suffix)
    );
  end loop;
end;
$$;

revoke all on function private.notify_super_admins_money_event(text,text,text,text,text,text,text,uuid,text)
from public, anon, authenticated, service_role;

create or replace function private.notify_customer_return_money_event(
  p_return_request_id uuid,
  p_event_key text,
  p_title_ar text,
  p_title_en text,
  p_body_ar text,
  p_body_en text,
  p_send_email boolean default true,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_customer_user_id uuid;
  v_email text;
  v_payload jsonb;
begin
  select rr.order_id,o.order_number,o.customer_user_id,d.email
  into v_order_id,v_order_number,v_customer_user_id,v_email
  from private.return_requests rr
  join public.orders o on o.id = rr.order_id
  join public.order_customer_details d on d.order_id = o.id
  where rr.id = p_return_request_id;

  if not found then return; end if;

  v_payload := coalesce(p_payload,'{}'::jsonb)
    || jsonb_build_object(
      'audience','customer',
      'orderId',v_order_id,
      'orderNumber',v_order_number,
      'returnRequestId',p_return_request_id
    );

  if v_customer_user_id is not null then
    perform private.emit_notification(
      v_customer_user_id,p_event_key,p_title_ar,p_title_en,p_body_ar,p_body_en,
      '/account/orders','return_request',p_return_request_id,
      format('inapp:customer:return:%s:%s',p_return_request_id,p_event_key)
    );
  end if;

  if p_send_email and v_email is not null and trim(v_email) <> '' then
    perform private.enqueue_notification_email(
      p_event_key,v_email,'auto',p_event_key,v_payload,
      'return_request',p_return_request_id,
      format('email:customer:return:%s:%s',p_return_request_id,p_event_key)
    );
  end if;
end;
$$;

revoke all on function private.notify_customer_return_money_event(uuid,text,text,text,text,text,boolean,jsonb)
from public, anon, authenticated, service_role;

create or replace function private.handle_money_payment_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_artisan record;
begin
  if new.event_type not in ('payment_succeeded','cod_collected') then return new; end if;

  select p.order_id,o.order_number
  into v_order_id,v_order_number
  from private.payments p
  join public.orders o on o.id = p.order_id
  where p.id = new.payment_id;
  if not found then return new; end if;

  for v_artisan in
    select distinct g.artisan_id
    from public.order_artisan_groups g
    where g.order_id = v_order_id
  loop
    perform private.notify_artisan_money_event(
      v_artisan.artisan_id,
      'payment_confirmed_artisan',
      'تم تأكيد دفع الطلب',
      'Order payment confirmed',
      format('تم تأكيد الدفع للطلب %s.',v_order_number),
      format('Payment for order %s has been confirmed.',v_order_number),
      '/artisan/orders','payment',new.payment_id,
      format('payment:%s:%s',new.payment_id,new.event_type),
      true,
      jsonb_build_object('orderId',v_order_id,'orderNumber',v_order_number)
    );
  end loop;

  return new;
end;
$$;

revoke all on function private.handle_money_payment_notification()
from public, anon, authenticated, service_role;

drop trigger if exists money_payment_notification_trigger on private.payment_events;
create trigger money_payment_notification_trigger
after insert on private.payment_events
for each row execute function private.handle_money_payment_notification();

create or replace function private.handle_money_return_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_artisan record;
  v_amount text;
begin
  select rr.order_id,o.order_number
  into v_order_id,v_order_number
  from private.return_requests rr
  join public.orders o on o.id = rr.order_id
  where rr.id = new.return_request_id;
  if not found then return new; end if;

  if new.event_type = 'return_requested' then
    perform private.notify_customer_return_money_event(
      new.return_request_id,'return_requested',
      'تم استلام طلب الإرجاع','Return request received',
      format('استلمنا طلب الإرجاع الخاص بطلبك %s وسيقوم فريق IRTH بمراجعته.',v_order_number),
      format('We received your return request for order %s and IRTH will review it.',v_order_number),
      true,'{}'::jsonb
    );

    for v_artisan in
      select distinct oi.artisan_id
      from private.return_request_items ri
      join public.order_items oi on oi.id = ri.order_item_id
      where ri.return_request_id = new.return_request_id
    loop
      perform private.notify_artisan_money_event(
        v_artisan.artisan_id,'return_requested_artisan',
        'يوجد طلب إرجاع','A return was requested',
        format('تم تقديم طلب إرجاع على منتج من الطلب %s. IRTH ستدير التواصل والمراجعة.',v_order_number),
        format('A return was requested for an item in order %s. IRTH will manage the review and communication.',v_order_number),
        '/artisan/orders','return_request',new.return_request_id,
        format('return:%s:requested',new.return_request_id),true,
        jsonb_build_object('orderId',v_order_id,'orderNumber',v_order_number)
      );
    end loop;

    perform private.notify_super_admins_money_event(
      'return_requested_admin','طلب إرجاع يحتاج مراجعة','Return request needs review',
      format('يوجد طلب إرجاع جديد مرتبط بالطلب %s.',v_order_number),
      format('A new return request is linked to order %s.',v_order_number),
      '/dashboard-admin/orders','return_request',new.return_request_id,
      format('return:%s:requested',new.return_request_id)
    );
  elsif new.event_type = 'return_approved' then
    perform private.notify_customer_return_money_event(
      new.return_request_id,'return_approved',
      'تم قبول طلب الإرجاع','Return request approved',
      format('تم قبول طلب الإرجاع الخاص بطلبك %s. سيتابع فريق IRTH خطوات الإرجاع معك.',v_order_number),
      format('Your return request for order %s was approved. IRTH will coordinate the next steps.',v_order_number),
      true,'{}'::jsonb
    );
  elsif new.event_type = 'return_rejected' then
    perform private.notify_customer_return_money_event(
      new.return_request_id,'return_rejected',
      'لم تتم الموافقة على طلب الإرجاع','Return request not approved',
      format('لم تتم الموافقة على طلب الإرجاع الخاص بطلبك %s في المراجعة الحالية.',v_order_number),
      format('Your return request for order %s was not approved in the current review.',v_order_number),
      true,'{}'::jsonb
    );
  elsif new.event_type = 'refund_prepared' then
    perform private.notify_customer_return_money_event(
      new.return_request_id,'refund_processing',
      'جاري تجهيز الاسترداد','Refund is being prepared',
      format('بدأ فريق IRTH تجهيز الاسترداد الخاص بطلبك %s.',v_order_number),
      format('IRTH has started preparing the refund for order %s.',v_order_number),
      true,'{}'::jsonb
    );
  elsif new.event_type = 'refund_succeeded' then
    v_amount := coalesce(new.metadata->>'amount','');
    perform private.notify_customer_return_money_event(
      new.return_request_id,'refund_succeeded',
      'تم تسجيل الاسترداد بنجاح','Refund completed',
      format('تم تسجيل استرداد طلبك %s بنجاح.',v_order_number),
      format('The refund for order %s was completed successfully.',v_order_number),
      true,jsonb_build_object('amount',v_amount)
    );

    for v_artisan in
      select distinct oi.artisan_id
      from private.return_request_items ri
      join public.order_items oi on oi.id = ri.order_item_id
      where ri.return_request_id = new.return_request_id
    loop
      perform private.notify_artisan_money_event(
        v_artisan.artisan_id,'refund_adjusted_artisan',
        'تم تحديث المستحقات بعد الاسترداد','Earnings adjusted after refund',
        format('تم تحديث مستحقات الطلب %s بعد تنفيذ الاسترداد.',v_order_number),
        format('Your earnings for order %s were adjusted after the refund was completed.',v_order_number),
        '/artisan/payouts','return_request',new.return_request_id,
        format('return:%s:refund_succeeded',new.return_request_id),true,
        jsonb_build_object('orderId',v_order_id,'orderNumber',v_order_number,'amount',v_amount)
      );
    end loop;
  end if;

  return new;
end;
$$;

revoke all on function private.handle_money_return_notification()
from public, anon, authenticated, service_role;

drop trigger if exists money_return_notification_trigger on private.return_request_events;
create trigger money_return_notification_trigger
after insert on private.return_request_events
for each row execute function private.handle_money_return_notification();

create or replace function private.handle_payout_account_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan_id uuid;
begin
  select a.artisan_id into v_artisan_id
  from private.artisan_payout_accounts a
  where a.id = new.payout_account_id;
  if not found then return new; end if;

  if new.event_type = 'payout_account_submitted' then
    perform private.notify_super_admins_money_event(
      'payout_account_submitted_admin',
      'بيانات صرف تحتاج مراجعة','Payout details need review',
      'قام حرفي بإضافة أو تغيير بيانات الصرف ويجب مراجعتها قبل تفعيلها.',
      'An artisan added or changed payout details and they must be reviewed before activation.',
      '/dashboard-admin/payouts','payout_account',new.payout_account_id,
      format('payout-account:%s:submitted',new.payout_account_id)
    );
  elsif new.event_type = 'payout_account_approved' then
    perform private.notify_artisan_money_event(
      v_artisan_id,'payout_account_approved',
      'تم اعتماد بيانات الصرف','Payout details approved',
      'تمت مراجعة واعتماد بيانات الصرف الخاصة بك.',
      'Your payout details were reviewed and approved.',
      '/artisan/payouts/setting','payout_account',new.payout_account_id,
      format('payout-account:%s:approved',new.payout_account_id),true,'{}'::jsonb
    );
  elsif new.event_type = 'payout_account_rejected' then
    perform private.notify_artisan_money_event(
      v_artisan_id,'payout_account_rejected',
      'بيانات الصرف تحتاج تعديل','Payout details need changes',
      'لم يتم اعتماد بيانات الصرف في المراجعة الحالية. راجع الحالة وأرسل بيانات جديدة عند الحاجة.',
      'Your payout details were not approved in the current review. Check the status and submit new details if needed.',
      '/artisan/payouts/setting','payout_account',new.payout_account_id,
      format('payout-account:%s:rejected',new.payout_account_id),true,'{}'::jsonb
    );
  end if;
  return new;
end;
$$;

revoke all on function private.handle_payout_account_notification()
from public, anon, authenticated, service_role;

drop trigger if exists payout_account_notification_trigger on private.payout_account_events;
create trigger payout_account_notification_trigger
after insert on private.payout_account_events
for each row execute function private.handle_payout_account_notification();

create or replace function private.handle_payout_batch_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch_number text;
  v_artisan record;
  v_event_key text;
  v_title_ar text;
  v_title_en text;
  v_body_ar text;
  v_body_en text;
  v_send_email boolean := false;
begin
  if new.event_type not in ('payout_batch_created','payout_batch_cancelled','payout_batch_paid') then return new; end if;

  select b.batch_number into v_batch_number
  from private.payout_batches b where b.id = new.payout_batch_id;
  if not found then return new; end if;

  if new.event_type = 'payout_batch_created' then
    v_event_key := 'payout_batch_created';
    v_title_ar := 'مستحقاتك دخلت دفعة صرف';
    v_title_en := 'Your earnings entered a payout batch';
    v_body_ar := format('تم إدراج مستحقاتك في دفعة الصرف %s وهي قيد التنفيذ.',v_batch_number);
    v_body_en := format('Your earnings were included in payout batch %s and are being processed.',v_batch_number);
  elsif new.event_type = 'payout_batch_cancelled' then
    v_event_key := 'payout_batch_cancelled';
    v_title_ar := 'تم إلغاء دفعة الصرف الحالية';
    v_title_en := 'Current payout batch cancelled';
    v_body_ar := format('تم إلغاء دفعة الصرف %s. ستظل المستحقات خاضعة لقواعد الاستحقاق ويمكن إدراجها لاحقًا.',v_batch_number);
    v_body_en := format('Payout batch %s was cancelled. Eligible earnings can be included again later.',v_batch_number);
  else
    v_event_key := 'payout_batch_paid';
    v_title_ar := 'تم تسجيل عملية الصرف';
    v_title_en := 'Payout recorded';
    v_body_ar := format('تم تسجيل دفعة الصرف %s كمدفوعة.',v_batch_number);
    v_body_en := format('Payout batch %s was recorded as paid.',v_batch_number);
    v_send_email := true;
  end if;

  for v_artisan in
    select i.artisan_id, i.currency_code, round(sum(i.amount), max(i.currency_minor_unit_scale)) as amount
    from private.payout_batch_items i
    where i.payout_batch_id = new.payout_batch_id
    group by i.artisan_id,i.currency_code
  loop
    perform private.notify_artisan_money_event(
      v_artisan.artisan_id,v_event_key,
      v_title_ar,v_title_en,v_body_ar,v_body_en,
      '/artisan/payouts','payout_batch',new.payout_batch_id,
      format('payout-batch:%s:%s',new.payout_batch_id,new.event_type),
      v_send_email,
      jsonb_build_object('batchNumber',v_batch_number,'amount',v_artisan.amount::text,'currencyCode',v_artisan.currency_code)
    );
  end loop;

  return new;
end;
$$;

revoke all on function private.handle_payout_batch_notification()
from public, anon, authenticated, service_role;

drop trigger if exists payout_batch_notification_trigger on private.payout_batch_events;
create trigger payout_batch_notification_trigger
after insert on private.payout_batch_events
for each row execute function private.handle_payout_batch_notification();
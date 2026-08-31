alter table private.notification_email_outbox
  drop constraint if exists notification_email_outbox_locale_check;

alter table private.notification_email_outbox
  add constraint notification_email_outbox_locale_check
  check (locale in ('ar','en','auto'));

alter table private.notification_email_outbox
  alter column locale set default 'auto';

create or replace function private.enqueue_notification_email(
  p_event_key text,
  p_recipient_email text,
  p_locale text,
  p_template_key text,
  p_payload jsonb,
  p_source_type text,
  p_source_id uuid,
  p_dedupe_key text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_email text := lower(trim(p_recipient_email));
  v_locale text := lower(trim(coalesce(p_locale, 'auto')));
begin
  if v_email = '' or char_length(v_email) > 320 or position('@' in v_email) <= 1 then
    raise exception 'invalid_notification_email' using errcode = '22023';
  end if;

  if v_locale not in ('ar','en','auto') then
    raise exception 'invalid_notification_locale' using errcode = '22023';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid_notification_payload' using errcode = '22023';
  end if;

  insert into private.notification_email_outbox (
    event_key, recipient_email, locale, template_key, payload,
    source_type, source_id, dedupe_key
  ) values (
    lower(trim(p_event_key)), v_email, v_locale, lower(trim(p_template_key)), p_payload,
    case when p_source_type is null then null else lower(trim(p_source_type)) end,
    p_source_id, trim(p_dedupe_key)
  )
  on conflict (dedupe_key) do update
    set dedupe_key = excluded.dedupe_key
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function private.enqueue_notification_email(text,text,text,text,jsonb,text,uuid,text) from public, anon, authenticated;
grant execute on function private.enqueue_notification_email(text,text,text,text,jsonb,text,uuid,text) to service_role;

create or replace function private.notify_customer_order_event(
  p_order_id uuid,
  p_event_key text,
  p_title_ar text,
  p_title_en text,
  p_body_ar text,
  p_body_en text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_number text;
  v_customer_user_id uuid;
  v_email text;
begin
  select o.order_number, o.customer_user_id, d.email
    into v_order_number, v_customer_user_id, v_email
  from public.orders o
  join public.order_customer_details d on d.order_id = o.id
  where o.id = p_order_id;

  if not found then return; end if;

  if v_customer_user_id is not null then
    perform private.emit_notification(
      v_customer_user_id,p_event_key,p_title_ar,p_title_en,p_body_ar,p_body_en,
      '/account/orders','order',p_order_id,
      format('inapp:customer:%s:%s',p_order_id,p_event_key)
    );
  end if;

  if v_email is not null and trim(v_email) <> '' then
    perform private.enqueue_notification_email(
      p_event_key,v_email,'auto',p_event_key,
      jsonb_build_object('orderId',p_order_id,'orderNumber',v_order_number,'audience','customer'),
      'order',p_order_id,
      format('email:customer:%s:%s',p_order_id,p_event_key)
    );
  end if;
end;
$$;

revoke all on function private.notify_customer_order_event(uuid,text,text,text,text,text) from public, anon, authenticated;

create or replace function private.handle_order_status_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_number text;
  v_artisan record;
  v_admin record;
begin
  select o.order_number into v_order_number from public.orders o where o.id = new.order_id;

  if new.status = 'received' then
    perform private.notify_customer_order_event(new.order_id,'order_created','تم استلام طلبك','Order received',format('تم استلام طلبك %s بنجاح.',v_order_number),format('We received your order %s successfully.',v_order_number));

    for v_artisan in
      select distinct a.auth_user_id as user_id, u.email
      from public.order_artisan_groups g
      join public.artisan_profiles a on a.id=g.artisan_id
      left join auth.users u on u.id=a.auth_user_id
      where g.order_id=new.order_id and a.auth_user_id is not null
    loop
      perform private.emit_notification(v_artisan.user_id,'new_order','لديك طلب جديد','You have a new order',format('تم إنشاء طلب جديد مرتبط بمنتجاتك: %s.',v_order_number),format('A new order includes your products: %s.',v_order_number),'/artisan/orders','order',new.order_id,format('inapp:artisan:%s:%s:new_order',v_artisan.user_id,new.order_id));
      if v_artisan.email is not null and trim(v_artisan.email) <> '' then
        perform private.enqueue_notification_email('new_order',v_artisan.email,'auto','new_order',jsonb_build_object('orderId',new.order_id,'orderNumber',v_order_number,'audience','artisan'),'order',new.order_id,format('email:artisan:%s:%s:new_order',v_artisan.user_id,new.order_id));
      end if;
    end loop;

    for v_admin in
      select distinct ur.user_id from public.user_roles ur join public.roles r on r.id=ur.role_id where r.code='super_admin'
    loop
      perform private.emit_notification(v_admin.user_id,'new_order','طلب جديد على IRTH','New IRTH order',format('تم إنشاء الطلب %s.',v_order_number),format('Order %s was created.',v_order_number),'/dashboard-admin/orders','order',new.order_id,format('inapp:admin:%s:%s:new_order',v_admin.user_id,new.order_id));
    end loop;
  elsif new.status = 'confirmed' then
    perform private.notify_customer_order_event(new.order_id,'order_confirmed','تم تأكيد طلبك','Order confirmed',format('تم تأكيد طلبك %s.',v_order_number),format('Your order %s has been confirmed.',v_order_number));
  elsif new.status = 'ready_for_courier_pickup' then
    perform private.notify_customer_order_event(new.order_id,'ready_for_courier_pickup','طلبك جاهز لاستلام شركة الشحن','Ready for courier pickup',format('طلبك %s جاهز لاستلام شركة الشحن.',v_order_number),format('Your order %s is ready for courier pickup.',v_order_number));
  elsif new.status = 'picked_up_from_artisan' then
    perform private.notify_customer_order_event(new.order_id,'picked_up_from_artisan','تم استلام طلبك من الحرفي','Picked up from artisan',format('تم استلام طلبك %s من الحرفي.',v_order_number),format('Your order %s was picked up from the artisan.',v_order_number));
  elsif new.status = 'in_transit' then
    perform private.notify_customer_order_event(new.order_id,'in_transit','طلبك في الطريق','Order in transit',format('طلبك %s في الطريق إليك.',v_order_number),format('Your order %s is in transit.',v_order_number));
  elsif new.status = 'delivered' then
    perform private.notify_customer_order_event(new.order_id,'delivered','تم تسليم طلبك','Order delivered',format('تم تسليم طلبك %s.',v_order_number),format('Your order %s has been delivered.',v_order_number));
  elsif new.status = 'delivery_failed' then
    perform private.notify_customer_order_event(new.order_id,'delivery_failed','تعذر تسليم طلبك','Delivery attempt failed',format('تعذر تسليم طلبك %s. سيتابع فريق IRTH الحالة.',v_order_number),format('Delivery for order %s was unsuccessful. IRTH will follow up.',v_order_number));
  elsif new.status = 'cancelled' then
    perform private.notify_customer_order_event(new.order_id,'cancelled','تم إلغاء طلبك','Order cancelled',format('تم إلغاء طلبك %s.',v_order_number),format('Your order %s was cancelled.',v_order_number));
  elsif new.status = 'returned' then
    perform private.notify_customer_order_event(new.order_id,'returned','تم تحديث طلبك كمرتجع','Order returned',format('تم تحديث طلبك %s كمرتجع.',v_order_number),format('Your order %s was marked as returned.',v_order_number));
  end if;
  return new;
end;
$$;

revoke all on function private.handle_order_status_notification() from public, anon, authenticated;
drop trigger if exists order_status_notification_trigger on public.order_status_history;
create trigger order_status_notification_trigger after insert on public.order_status_history for each row execute function private.handle_order_status_notification();

create or replace function private.handle_artisan_group_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_order_number text;
begin
  if new.to_status='preparing' then
    select o.order_number into v_order_number from public.orders o where o.id=new.order_id;
    perform private.notify_customer_order_event(new.order_id,'preparing','بدأ تجهيز طلبك','Order preparation started',format('بدأ تجهيز طلبك %s.',v_order_number),format('Preparation has started for your order %s.',v_order_number));
  end if;
  return new;
end;
$$;

revoke all on function private.handle_artisan_group_notification() from public, anon, authenticated;
drop trigger if exists artisan_group_notification_trigger on public.order_artisan_group_status_history;
create trigger artisan_group_notification_trigger after insert on public.order_artisan_group_status_history for each row execute function private.handle_artisan_group_notification();

create or replace function private.handle_tracking_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_number text;
  v_customer_user_id uuid;
  v_email text;
begin
  if new.new_tracking_number is null and new.new_tracking_url is null then return new; end if;

  select o.order_number,o.customer_user_id,d.email into v_order_number,v_customer_user_id,v_email
  from public.orders o join public.order_customer_details d on d.order_id=o.id where o.id=new.order_id;
  if not found then return new; end if;

  if v_customer_user_id is not null then
    perform private.emit_notification(v_customer_user_id,'tracking_updated','تم تحديث بيانات تتبع طلبك','Tracking updated',format('تم تحديث بيانات تتبع طلبك %s.',v_order_number),format('Tracking details for order %s were updated.',v_order_number),'/account/orders','shipment',new.shipment_id,format('inapp:customer:%s:tracking:%s',new.order_id,new.id));
  end if;

  if v_email is not null and trim(v_email) <> '' then
    perform private.enqueue_notification_email('tracking_updated',v_email,'auto','tracking_updated',jsonb_build_object('orderId',new.order_id,'orderNumber',v_order_number,'shipmentId',new.shipment_id,'audience','customer'),'shipment',new.shipment_id,format('email:customer:%s:tracking:%s',new.order_id,new.id));
  end if;
  return new;
end;
$$;

revoke all on function private.handle_tracking_notification() from public, anon, authenticated;
drop trigger if exists shipment_tracking_notification_trigger on public.shipment_tracking_history;
create trigger shipment_tracking_notification_trigger after insert on public.shipment_tracking_history for each row execute function private.handle_tracking_notification();

alter table private.notification_email_outbox
  add column if not exists provider text null,
  add column if not exists provider_message_id text null,
  add column if not exists last_attempt_at timestamptz null;

alter table private.notification_email_outbox
  drop constraint if exists notification_email_outbox_provider_check;

alter table private.notification_email_outbox
  add constraint notification_email_outbox_provider_check
  check (provider is null or provider ~ '^[a-z0-9][a-z0-9_]{1,63}$');

create or replace function private.claim_notification_email_outbox(p_limit integer default 10)
returns table(
  id uuid,
  event_key text,
  recipient_email text,
  locale text,
  template_key text,
  payload jsonb,
  source_type text,
  source_id uuid,
  dedupe_key text,
  attempts integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 10), 50));
begin
  return query
  with candidates as (
    select e.id
    from private.notification_email_outbox e
    where e.attempts < 5
      and (
        (e.status in ('pending','failed') and e.available_at <= now())
        or
        (e.status = 'processing' and e.locked_at < now() - interval '15 minutes')
      )
    order by e.available_at, e.created_at, e.id
    for update skip locked
    limit v_limit
  )
  update private.notification_email_outbox e
  set status = 'processing',
      attempts = e.attempts + 1,
      locked_at = now(),
      last_attempt_at = now(),
      last_error = null,
      updated_at = now()
  from candidates c
  where e.id = c.id
  returning e.id, e.event_key, e.recipient_email, e.locale, e.template_key,
            e.payload, e.source_type, e.source_id, e.dedupe_key, e.attempts;
end;
$$;

create or replace function private.mark_notification_email_sent(
  p_id uuid,
  p_provider text,
  p_provider_message_id text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update private.notification_email_outbox
  set status = 'sent',
      provider = lower(trim(p_provider)),
      provider_message_id = nullif(trim(p_provider_message_id), ''),
      sent_at = now(),
      locked_at = null,
      last_error = null,
      updated_at = now()
  where id = p_id
    and status = 'processing';

  return found;
end;
$$;

create or replace function private.mark_notification_email_failed(
  p_id uuid,
  p_error text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update private.notification_email_outbox
  set status = 'failed',
      locked_at = null,
      last_error = left(coalesce(nullif(trim(p_error), ''), 'email_send_failed'), 2000),
      available_at = now() + case
        when attempts <= 1 then interval '1 minute'
        when attempts = 2 then interval '5 minutes'
        when attempts = 3 then interval '30 minutes'
        when attempts = 4 then interval '2 hours'
        else interval '12 hours'
      end,
      updated_at = now()
  where id = p_id
    and status = 'processing';

  return found;
end;
$$;

grant usage on schema private to service_role;
revoke all on function private.claim_notification_email_outbox(integer) from public, anon, authenticated;
revoke all on function private.mark_notification_email_sent(uuid,text,text) from public, anon, authenticated;
revoke all on function private.mark_notification_email_failed(uuid,text) from public, anon, authenticated;
grant execute on function private.claim_notification_email_outbox(integer) to service_role;
grant execute on function private.mark_notification_email_sent(uuid,text,text) to service_role;
grant execute on function private.mark_notification_email_failed(uuid,text) to service_role;

create or replace function public.claim_notification_email_outbox(p_limit integer default 10)
returns table(
  id uuid,
  event_key text,
  recipient_email text,
  locale text,
  template_key text,
  payload jsonb,
  source_type text,
  source_id uuid,
  dedupe_key text,
  attempts integer
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.claim_notification_email_outbox(p_limit);
$$;

create or replace function public.mark_notification_email_sent(
  p_id uuid,
  p_provider text,
  p_provider_message_id text
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.mark_notification_email_sent(p_id, p_provider, p_provider_message_id);
$$;

create or replace function public.mark_notification_email_failed(
  p_id uuid,
  p_error text
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.mark_notification_email_failed(p_id, p_error);
$$;

revoke all on function public.claim_notification_email_outbox(integer) from public, anon, authenticated;
revoke all on function public.mark_notification_email_sent(uuid,text,text) from public, anon, authenticated;
revoke all on function public.mark_notification_email_failed(uuid,text) from public, anon, authenticated;
grant execute on function public.claim_notification_email_outbox(integer) to service_role;
grant execute on function public.mark_notification_email_sent(uuid,text,text) to service_role;
grant execute on function public.mark_notification_email_failed(uuid,text) to service_role;

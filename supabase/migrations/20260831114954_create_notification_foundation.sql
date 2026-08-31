create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null check (event_key ~ '^[a-z0-9][a-z0-9_]{1,63}$'),
  title_ar text not null check (char_length(title_ar) between 1 and 200),
  title_en text not null check (char_length(title_en) between 1 and 200),
  body_ar text not null check (char_length(body_ar) between 1 and 1000),
  body_en text not null check (char_length(body_en) between 1 and 1000),
  link_path text null,
  source_type text null check (source_type is null or source_type ~ '^[a-z0-9][a-z0-9_]{1,63}$'),
  source_id uuid null,
  dedupe_key text not null unique check (char_length(dedupe_key) between 8 and 255),
  read_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint notifications_link_path_safe check (
    link_path is null or (
      link_path like '/%' and
      link_path not like '//%' and
      link_path !~ '[[:cntrl:]]' and
      link_path !~ '^/(api|auth)(/|$)'
    )
  )
);

alter table public.notifications enable row level security;
revoke all on table public.notifications from public, anon, authenticated;
grant select, insert, update on table public.notifications to service_role;

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_user_id, created_at desc);
create index if not exists notifications_recipient_unread_idx
  on public.notifications(recipient_user_id, created_at desc)
  where read_at is null;
create index if not exists notifications_source_idx
  on public.notifications(source_type, source_id)
  where source_type is not null and source_id is not null;

create table if not exists private.notification_email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null check (event_key ~ '^[a-z0-9][a-z0-9_]{1,63}$'),
  recipient_email text not null check (char_length(recipient_email) between 3 and 320),
  locale text not null default 'en' check (locale in ('ar','en')),
  template_key text not null check (template_key ~ '^[a-z0-9][a-z0-9_]{1,63}$'),
  payload jsonb not null default '{}'::jsonb,
  source_type text null check (source_type is null or source_type ~ '^[a-z0-9][a-z0-9_]{1,63}$'),
  source_id uuid null,
  dedupe_key text not null unique check (char_length(dedupe_key) between 8 and 255),
  status text not null default 'pending' check (status in ('pending','processing','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz null,
  sent_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_email_outbox_payload_object check (jsonb_typeof(payload) = 'object')
);

revoke all on table private.notification_email_outbox from public, anon, authenticated;
grant select, insert, update on table private.notification_email_outbox to service_role;

create index if not exists notification_email_outbox_pending_idx
  on private.notification_email_outbox(status, available_at, created_at)
  where status in ('pending','failed');
create index if not exists notification_email_outbox_source_idx
  on private.notification_email_outbox(source_type, source_id)
  where source_type is not null and source_id is not null;

create or replace function private.emit_notification(
  p_recipient_user_id uuid,
  p_event_key text,
  p_title_ar text,
  p_title_en text,
  p_body_ar text,
  p_body_en text,
  p_link_path text,
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
begin
  if p_recipient_user_id is null then
    raise exception 'notification_recipient_required' using errcode = '22023';
  end if;

  if p_link_path is not null and not (
    p_link_path like '/%' and
    p_link_path not like '//%' and
    p_link_path !~ '[[:cntrl:]]' and
    p_link_path !~ '^/(api|auth)(/|$)'
  ) then
    raise exception 'invalid_notification_link_path' using errcode = '22023';
  end if;

  insert into public.notifications (
    recipient_user_id, event_key, title_ar, title_en, body_ar, body_en,
    link_path, source_type, source_id, dedupe_key
  ) values (
    p_recipient_user_id, lower(trim(p_event_key)), trim(p_title_ar), trim(p_title_en),
    trim(p_body_ar), trim(p_body_en), p_link_path,
    case when p_source_type is null then null else lower(trim(p_source_type)) end,
    p_source_id, trim(p_dedupe_key)
  )
  on conflict (dedupe_key) do update
    set dedupe_key = excluded.dedupe_key
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function private.emit_notification(uuid,text,text,text,text,text,text,text,uuid,text) from public, anon, authenticated;
grant execute on function private.emit_notification(uuid,text,text,text,text,text,text,text,uuid,text) to service_role;

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
  v_locale text := lower(trim(coalesce(p_locale, 'en')));
begin
  if v_email = '' or char_length(v_email) > 320 or position('@' in v_email) <= 1 then
    raise exception 'invalid_notification_email' using errcode = '22023';
  end if;

  if v_locale not in ('ar','en') then
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

create or replace function private.get_my_notifications(
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'unreadCount', (
      select count(*)::integer
      from public.notifications n
      where n.recipient_user_id = v_user_id
        and n.read_at is null
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id,
        'eventKey', n.event_key,
        'titleAr', n.title_ar,
        'titleEn', n.title_en,
        'bodyAr', n.body_ar,
        'bodyEn', n.body_en,
        'linkPath', n.link_path,
        'readAt', n.read_at,
        'createdAt', n.created_at
      ) order by n.created_at desc, n.id desc)
      from (
        select *
        from public.notifications
        where recipient_user_id = v_user_id
        order by created_at desc, id desc
        limit v_limit offset v_offset
      ) n
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_my_notifications(
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_my_notifications(p_limit, p_offset);
$$;

revoke all on function private.get_my_notifications(integer,integer) from public, anon;
grant execute on function private.get_my_notifications(integer,integer) to authenticated;
revoke all on function public.get_my_notifications(integer,integer) from public, anon;
grant execute on function public.get_my_notifications(integer,integer) to authenticated;

create or replace function private.mark_my_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_changed boolean := false;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
    and recipient_user_id = v_user_id
    and read_at is null;

  v_changed := found;
  return v_changed;
end;
$$;

create or replace function public.mark_my_notification_read(p_notification_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.mark_my_notification_read(p_notification_id);
$$;

revoke all on function private.mark_my_notification_read(uuid) from public, anon;
grant execute on function private.mark_my_notification_read(uuid) to authenticated;
revoke all on function public.mark_my_notification_read(uuid) from public, anon;
grant execute on function public.mark_my_notification_read(uuid) to authenticated;

create or replace function private.mark_all_my_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  update public.notifications
  set read_at = now()
  where recipient_user_id = v_user_id
    and read_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.mark_all_my_notifications_read()
returns integer
language sql
security invoker
set search_path = ''
as $$
  select private.mark_all_my_notifications_read();
$$;

revoke all on function private.mark_all_my_notifications_read() from public, anon;
grant execute on function private.mark_all_my_notifications_read() to authenticated;
revoke all on function public.mark_all_my_notifications_read() from public, anon;
grant execute on function public.mark_all_my_notifications_read() to authenticated;

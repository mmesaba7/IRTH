create table if not exists private.cms_section_registry (
  section_key text primary key,
  label text not null,
  default_order integer not null check (default_order > 0),
  is_reorderable boolean not null default true,
  created_at timestamptz not null default now(),
  unique (default_order)
);

create table if not exists private.cms_documents (
  id uuid primary key default gen_random_uuid(),
  document_key text not null unique,
  content_type text not null check (content_type in ('homepage','static_page','blog_post','campaign','footer','help','contact','brand','country_content')),
  draft_payload jsonb not null default '{}'::jsonb,
  published_payload jsonb,
  draft_revision integer not null default 1 check (draft_revision > 0),
  published_revision integer,
  updated_by_user_id uuid references auth.users(id),
  published_by_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (document_key ~ '^[a-z0-9][a-z0-9_:/.-]{0,119}$'),
  check (jsonb_typeof(draft_payload) = 'object'),
  check (published_payload is null or jsonb_typeof(published_payload) = 'object')
);

create index if not exists cms_documents_content_type_idx
  on private.cms_documents(content_type);

create index if not exists cms_documents_updated_by_idx
  on private.cms_documents(updated_by_user_id);

create index if not exists cms_documents_published_by_idx
  on private.cms_documents(published_by_user_id);

create table if not exists private.cms_document_versions (
  id bigint generated always as identity primary key,
  document_id uuid not null references private.cms_documents(id) on delete cascade,
  version_kind text not null check (version_kind in ('draft','published')),
  source_revision integer not null check (source_revision > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_by_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists cms_document_versions_document_created_idx
  on private.cms_document_versions(document_id, created_at desc, id desc);
create index if not exists cms_document_versions_created_by_idx
  on private.cms_document_versions(created_by_user_id);

create table if not exists private.cms_audit_events (
  id bigint generated always as identity primary key,
  document_id uuid references private.cms_documents(id) on delete set null,
  document_key text not null,
  action text not null check (action in ('created','draft_saved','published')),
  actor_user_id uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists cms_audit_events_document_created_idx
  on private.cms_audit_events(document_id, created_at desc, id desc);
create index if not exists cms_audit_events_actor_idx
  on private.cms_audit_events(actor_user_id);

insert into private.cms_section_registry(section_key,label,default_order,is_reorderable)
values
 ('hero','Hero',1,true),
 ('crafts','Crafts',2,true),
 ('explore_countries','Explore Countries',3,true),
 ('featured_products','Featured Products',4,true),
 ('best_sellers','Best Sellers',5,true),
 ('new_arrivals','New Arrivals',6,true),
 ('featured_artisans','Featured Artisans',7,true),
 ('promotions','Promotions',8,true),
 ('recently_viewed','Recently Viewed',9,true),
 ('story_brand','Story / Brand',10,true),
 ('wholesale_cta','Wholesale CTA',11,true),
 ('blog_highlights','Blog Highlights',12,true),
 ('trust_value','Trust / Value',13,true),
 ('footer','Footer',14,true)
on conflict (section_key) do update
set label = excluded.label,
    default_order = excluded.default_order,
    is_reorderable = excluded.is_reorderable;

insert into private.cms_documents(
  document_key, content_type, draft_payload, published_payload,
  draft_revision, published_revision
)
values (
  'homepage',
  'homepage',
  jsonb_build_object(
    'schemaVersion', 1,
    'sections', jsonb_build_array(
      jsonb_build_object('key','hero','visible',true,'order',1),
      jsonb_build_object('key','crafts','visible',true,'order',2),
      jsonb_build_object('key','explore_countries','visible',true,'order',3),
      jsonb_build_object('key','featured_products','visible',true,'order',4),
      jsonb_build_object('key','best_sellers','visible',true,'order',5),
      jsonb_build_object('key','new_arrivals','visible',true,'order',6),
      jsonb_build_object('key','featured_artisans','visible',true,'order',7),
      jsonb_build_object('key','promotions','visible',true,'order',8),
      jsonb_build_object('key','recently_viewed','visible',true,'order',9),
      jsonb_build_object('key','story_brand','visible',true,'order',10),
      jsonb_build_object('key','wholesale_cta','visible',true,'order',11),
      jsonb_build_object('key','blog_highlights','visible',true,'order',12),
      jsonb_build_object('key','trust_value','visible',true,'order',13),
      jsonb_build_object('key','footer','visible',true,'order',14)
    )
  ),
  jsonb_build_object(
    'schemaVersion', 1,
    'sections', jsonb_build_array(
      jsonb_build_object('key','hero','visible',true,'order',1),
      jsonb_build_object('key','crafts','visible',true,'order',2),
      jsonb_build_object('key','explore_countries','visible',true,'order',3),
      jsonb_build_object('key','featured_products','visible',true,'order',4),
      jsonb_build_object('key','best_sellers','visible',true,'order',5),
      jsonb_build_object('key','new_arrivals','visible',true,'order',6),
      jsonb_build_object('key','featured_artisans','visible',true,'order',7),
      jsonb_build_object('key','promotions','visible',true,'order',8),
      jsonb_build_object('key','recently_viewed','visible',true,'order',9),
      jsonb_build_object('key','story_brand','visible',true,'order',10),
      jsonb_build_object('key','wholesale_cta','visible',true,'order',11),
      jsonb_build_object('key','blog_highlights','visible',true,'order',12),
      jsonb_build_object('key','trust_value','visible',true,'order',13),
      jsonb_build_object('key','footer','visible',true,'order',14)
    )
  ),
  1,
  1
)
on conflict (document_key) do nothing;

create or replace function public.get_published_cms_document(p_document_key text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select case
    when d.published_payload is null then null
    else jsonb_build_object(
      'key', d.document_key,
      'contentType', d.content_type,
      'revision', d.published_revision,
      'publishedAt', d.published_at,
      'payload', d.published_payload
    )
  end
  from private.cms_documents d
  where d.document_key = p_document_key;
$$;

create or replace function public.get_admin_cms_document(
  p_document_key text,
  p_admin_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc private.cms_documents%rowtype;
begin
  perform private.require_super_admin_user(p_admin_user_id);

  select * into v_doc
  from private.cms_documents
  where document_key = p_document_key;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_doc.id,
    'key', v_doc.document_key,
    'contentType', v_doc.content_type,
    'draftRevision', v_doc.draft_revision,
    'publishedRevision', v_doc.published_revision,
    'draftPayload', v_doc.draft_payload,
    'publishedPayload', v_doc.published_payload,
    'updatedAt', v_doc.updated_at,
    'publishedAt', v_doc.published_at
  );
end;
$$;

create or replace function public.get_admin_cms_section_registry(p_admin_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.require_super_admin_user(p_admin_user_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'key', r.section_key,
    'label', r.label,
    'defaultOrder', r.default_order,
    'reorderable', r.is_reorderable
  ) order by r.default_order), '[]'::jsonb)
  into v_result
  from private.cms_section_registry r;

  return v_result;
end;
$$;

create or replace function public.save_admin_cms_draft(
  p_document_key text,
  p_content_type text,
  p_payload jsonb,
  p_admin_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc private.cms_documents%rowtype;
  v_action text;
begin
  perform private.require_super_admin_user(p_admin_user_id);

  if p_document_key is null or p_document_key !~ '^[a-z0-9][a-z0-9_:/.-]{0,119}$' then
    raise exception 'invalid_document_key';
  end if;

  if p_content_type not in ('homepage','static_page','blog_post','campaign','footer','help','contact','brand','country_content') then
    raise exception 'invalid_content_type';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid_cms_payload';
  end if;

  select * into v_doc
  from private.cms_documents
  where document_key = p_document_key
  for update;

  if not found then
    insert into private.cms_documents(
      document_key, content_type, draft_payload, draft_revision,
      updated_by_user_id, created_at, updated_at
    ) values (
      p_document_key, p_content_type, p_payload, 1,
      p_admin_user_id, now(), now()
    ) returning * into v_doc;
    v_action := 'created';
  else
    if v_doc.content_type <> p_content_type then
      raise exception 'content_type_mismatch';
    end if;

    update private.cms_documents
    set draft_payload = p_payload,
        draft_revision = draft_revision + 1,
        updated_by_user_id = p_admin_user_id,
        updated_at = now()
    where id = v_doc.id
    returning * into v_doc;
    v_action := 'draft_saved';
  end if;

  insert into private.cms_document_versions(
    document_id, version_kind, source_revision, payload, created_by_user_id
  ) values (
    v_doc.id, 'draft', v_doc.draft_revision, v_doc.draft_payload, p_admin_user_id
  );

  insert into private.cms_audit_events(
    document_id, document_key, action, actor_user_id, metadata
  ) values (
    v_doc.id, v_doc.document_key, v_action, p_admin_user_id,
    jsonb_build_object('draftRevision', v_doc.draft_revision)
  );

  return jsonb_build_object(
    'key', v_doc.document_key,
    'draftRevision', v_doc.draft_revision,
    'updatedAt', v_doc.updated_at
  );
end;
$$;

create or replace function public.publish_admin_cms_document(
  p_document_key text,
  p_admin_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc private.cms_documents%rowtype;
begin
  perform private.require_super_admin_user(p_admin_user_id);

  select * into v_doc
  from private.cms_documents
  where document_key = p_document_key
  for update;

  if not found then
    raise exception 'cms_document_not_found';
  end if;

  update private.cms_documents
  set published_payload = draft_payload,
      published_revision = draft_revision,
      published_by_user_id = p_admin_user_id,
      published_at = now(),
      updated_at = now()
  where id = v_doc.id
  returning * into v_doc;

  insert into private.cms_document_versions(
    document_id, version_kind, source_revision, payload, created_by_user_id
  ) values (
    v_doc.id, 'published', v_doc.published_revision, v_doc.published_payload, p_admin_user_id
  );

  insert into private.cms_audit_events(
    document_id, document_key, action, actor_user_id, metadata
  ) values (
    v_doc.id, v_doc.document_key, 'published', p_admin_user_id,
    jsonb_build_object('publishedRevision', v_doc.published_revision)
  );

  return jsonb_build_object(
    'key', v_doc.document_key,
    'publishedRevision', v_doc.published_revision,
    'publishedAt', v_doc.published_at
  );
end;
$$;

revoke all on function public.get_admin_cms_document(text,uuid) from public, anon, authenticated;
revoke all on function public.get_admin_cms_section_registry(uuid) from public, anon, authenticated;
revoke all on function public.save_admin_cms_draft(text,text,jsonb,uuid) from public, anon, authenticated;
revoke all on function public.publish_admin_cms_document(text,uuid) from public, anon, authenticated;

grant execute on function public.get_admin_cms_document(text,uuid) to service_role;
grant execute on function public.get_admin_cms_section_registry(uuid) to service_role;
grant execute on function public.save_admin_cms_draft(text,text,jsonb,uuid) to service_role;
grant execute on function public.publish_admin_cms_document(text,uuid) to service_role;

revoke all on function public.get_published_cms_document(text) from public;
grant execute on function public.get_published_cms_document(text) to anon, authenticated, service_role;

revoke all on private.cms_section_registry from anon, authenticated;
revoke all on private.cms_documents from anon, authenticated;
revoke all on private.cms_document_versions from anon, authenticated;
revoke all on private.cms_audit_events from anon, authenticated;

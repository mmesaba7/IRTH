create or replace function public.get_admin_cms_history(
  p_admin_user_id uuid,
  p_document_key text default null,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 200));
  v_document_key text := nullif(btrim(coalesce(p_document_key, '')), '');
  v_events jsonb;
  v_versions jsonb;
begin
  perform private.require_super_admin_user(p_admin_user_id);

  select coalesce(jsonb_agg(item order by created_at desc, id desc), '[]'::jsonb)
  into v_events
  from (
    select
      e.id,
      e.created_at,
      jsonb_build_object(
        'id', e.id,
        'documentKey', e.document_key,
        'contentType', d.content_type,
        'action', e.action,
        'actorUserId', e.actor_user_id,
        'metadata', e.metadata,
        'createdAt', e.created_at
      ) as item
    from private.cms_audit_events e
    left join private.cms_documents d on d.id = e.document_id
    where v_document_key is null or e.document_key = v_document_key
    order by e.created_at desc, e.id desc
    limit v_limit
  ) recent_events;

  select coalesce(jsonb_agg(item order by created_at desc, id desc), '[]'::jsonb)
  into v_versions
  from (
    select
      v.id,
      v.created_at,
      jsonb_build_object(
        'id', v.id,
        'documentKey', d.document_key,
        'contentType', d.content_type,
        'versionKind', v.version_kind,
        'sourceRevision', v.source_revision,
        'createdByUserId', v.created_by_user_id,
        'createdAt', v.created_at
      ) as item
    from private.cms_document_versions v
    join private.cms_documents d on d.id = v.document_id
    where v_document_key is null or d.document_key = v_document_key
    order by v.created_at desc, v.id desc
    limit v_limit
  ) recent_versions;

  return jsonb_build_object(
    'documentKey', v_document_key,
    'limit', v_limit,
    'events', v_events,
    'versions', v_versions
  );
end;
$$;

revoke all on function public.get_admin_cms_history(uuid, text, integer) from public;
revoke all on function public.get_admin_cms_history(uuid, text, integer) from anon;
revoke all on function public.get_admin_cms_history(uuid, text, integer) from authenticated;
grant execute on function public.get_admin_cms_history(uuid, text, integer) to service_role;

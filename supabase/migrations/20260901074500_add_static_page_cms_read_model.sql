create or replace function public.get_admin_static_pages(p_admin_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.require_super_admin_user(p_admin_user_id);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'key', d.document_key,
        'draftRevision', d.draft_revision,
        'publishedRevision', d.published_revision,
        'draftPayload', d.draft_payload,
        'publishedPayload', d.published_payload,
        'updatedAt', d.updated_at,
        'publishedAt', d.published_at
      )
      order by d.updated_at desc, d.created_at desc
    ),
    '[]'::jsonb
  ) into v_result
  from private.cms_documents d
  where d.content_type = 'static_page';

  return v_result;
end;
$$;

revoke all on function public.get_admin_static_pages(uuid) from public, anon, authenticated;
grant execute on function public.get_admin_static_pages(uuid) to service_role;

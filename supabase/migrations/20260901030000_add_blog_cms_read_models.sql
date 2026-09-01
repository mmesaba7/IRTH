create or replace function public.get_published_blog_posts(p_limit integer default 12)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_result jsonb;
begin
  v_limit := greatest(1, least(coalesce(p_limit, 12), 50));

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key', d.document_key,
        'revision', d.published_revision,
        'publishedAt', d.published_at,
        'payload', d.published_payload
      )
      order by d.published_at desc nulls last, d.created_at desc
    ),
    '[]'::jsonb
  )
  into v_result
  from (
    select *
    from private.cms_documents
    where content_type = 'blog_post'
      and published_payload is not null
      and published_revision is not null
      and published_at is not null
    order by published_at desc, created_at desc
    limit v_limit
  ) d;

  return v_result;
end;
$$;

create or replace function public.get_admin_blog_posts(p_admin_user_id uuid)
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
  )
  into v_result
  from private.cms_documents d
  where d.content_type = 'blog_post';

  return v_result;
end;
$$;

revoke all on function public.get_published_blog_posts(integer) from public;
grant execute on function public.get_published_blog_posts(integer) to anon, authenticated, service_role;

revoke all on function public.get_admin_blog_posts(uuid) from public, anon, authenticated;
grant execute on function public.get_admin_blog_posts(uuid) to service_role;

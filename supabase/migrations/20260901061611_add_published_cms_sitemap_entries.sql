create or replace function public.get_published_cms_sitemap_entries()
returns table (
  document_key text,
  content_type text,
  published_at timestamptz,
  payload jsonb
)
language sql
security definer
set search_path = ''
as $$
  select
    d.document_key,
    d.content_type,
    d.published_at,
    d.published_payload as payload
  from private.cms_documents as d
  where d.published_payload is not null
    and d.content_type in ('static_page', 'blog_post', 'country_content')
  order by d.published_at desc nulls last, d.document_key asc;
$$;

revoke all on function public.get_published_cms_sitemap_entries() from public;
revoke all on function public.get_published_cms_sitemap_entries() from anon;
revoke all on function public.get_published_cms_sitemap_entries() from authenticated;
grant execute on function public.get_published_cms_sitemap_entries() to service_role;

insert into private.cms_document_versions(document_id, version_kind, source_revision, payload, created_by_user_id)
select d.id, 'draft', d.draft_revision, d.draft_payload, null
from private.cms_documents d
where d.document_key = 'homepage'
  and not exists (
    select 1 from private.cms_document_versions v
    where v.document_id = d.id and v.version_kind = 'draft' and v.source_revision = d.draft_revision
  );

insert into private.cms_document_versions(document_id, version_kind, source_revision, payload, created_by_user_id)
select d.id, 'published', d.published_revision, d.published_payload, null
from private.cms_documents d
where d.document_key = 'homepage'
  and d.published_payload is not null
  and d.published_revision is not null
  and not exists (
    select 1 from private.cms_document_versions v
    where v.document_id = d.id and v.version_kind = 'published' and v.source_revision = d.published_revision
  );

insert into private.cms_audit_events(document_id, document_key, action, actor_user_id, metadata)
select d.id, d.document_key, 'created', null,
       jsonb_build_object('baseline', true, 'draftRevision', d.draft_revision, 'publishedRevision', d.published_revision)
from private.cms_documents d
where d.document_key = 'homepage'
  and not exists (
    select 1 from private.cms_audit_events a
    where a.document_id = d.id and a.action = 'created'
  );

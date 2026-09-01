alter table public.products
  add column if not exists published_at timestamptz;

update public.products p
set published_at = coalesce(
  (
    select min(mr.reviewed_at)
    from public.moderation_requests mr
    where mr.subject_type = 'product'
      and mr.action = 'publish'
      and mr.status = 'approved'
      and mr.subject_id = p.id
      and mr.reviewed_at is not null
  ),
  p.created_at
)
where p.lifecycle_status = 'published'
  and p.published_at is null;

create or replace function public.set_product_publication_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.lifecycle_status = 'published' and new.published_at is null then
      new.published_at := pg_catalog.now();
    end if;
    return new;
  end if;

  if old.published_at is not null then
    new.published_at := old.published_at;
    return new;
  end if;

  if new.lifecycle_status = 'published'
     and old.lifecycle_status is distinct from 'published' then
    new.published_at := pg_catalog.now();
  end if;

  return new;
end;
$$;

drop trigger if exists set_product_publication_timestamp_trigger on public.products;
create trigger set_product_publication_timestamp_trigger
before insert or update of lifecycle_status, published_at on public.products
for each row
execute function public.set_product_publication_timestamp();
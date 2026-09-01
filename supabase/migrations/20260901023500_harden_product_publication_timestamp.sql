create or replace function public.set_product_publication_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.lifecycle_status = 'published' then
      new.published_at := pg_catalog.now();
    else
      new.published_at := null;
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
  else
    new.published_at := null;
  end if;

  return new;
end;
$$;

revoke all on function public.set_product_publication_timestamp() from public;
revoke all on function public.set_product_publication_timestamp() from anon;
revoke all on function public.set_product_publication_timestamp() from authenticated;

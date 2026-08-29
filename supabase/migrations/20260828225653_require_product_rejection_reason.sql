create or replace function public.apply_product_moderation_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if old.status <> 'pending' or new.status = old.status then
    return new;
  end if;

  if new.subject_type <> 'product' or new.action <> 'publish' then
    return new;
  end if;

  if new.status not in ('approved', 'rejected') then
    raise exception 'Invalid moderation decision';
  end if;

  if new.reviewed_by is distinct from (select auth.uid()) then
    raise exception 'reviewed_by must match the current user';
  end if;

  if new.status = 'rejected'
     and pg_catalog.btrim(pg_catalog.coalesce(new.admin_note, '')) = '' then
    raise exception 'Product rejection requires an admin reason';
  end if;

  new.reviewed_at := pg_catalog.now();

  if new.status = 'approved' then
    update public.products
    set lifecycle_status = 'published',
        updated_at = pg_catalog.now()
    where id = new.subject_id
      and lifecycle_status = 'draft';

    if not found then
      raise exception 'Product is not available for publication';
    end if;
  end if;

  return new;
end;
$function$;;

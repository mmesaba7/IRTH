create or replace function public.reorder_product_images (
  p_product_id uuid,
  p_media_ids uuid[]
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  expected_count integer;
  provided_count integer;
  distinct_count integer;
  media_id uuid;
  position_index integer := 0;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_product_id::text, 0)
  );

  provided_count := coalesce(
    pg_catalog.array_length(p_media_ids, 1),
    0
  );

  select count(*)
    into expected_count
  from public.product_media
  where product_id = p_product_id
    and media_type = 'image';

  if provided_count <> expected_count then
    raise exception
      'Image reorder must include every product image exactly once';
  end if;

  select count(distinct value)
    into distinct_count
  from pg_catalog.unnest(p_media_ids) as value;

  if distinct_count <> provided_count then
    raise exception
      'Image reorder contains duplicate media ids';
  end if;

  if exists (
    select 1
    from pg_catalog.unnest(p_media_ids) as requested(id)
    where not exists (
      select 1
      from public.product_media pm
      where pm.id = requested.id
        and pm.product_id = p_product_id
        and pm.media_type = 'image'
    )
  ) then
    raise exception
      'Image reorder contains media that does not belong to this product';
  end if;

  update public.product_media
  set sort_order = sort_order + 1000,
      updated_at = pg_catalog.now()
  where product_id = p_product_id
    and media_type = 'image';

  foreach media_id in array p_media_ids
  loop
    update public.product_media
    set sort_order = position_index,
        updated_at = pg_catalog.now()
    where id = media_id
      and product_id = p_product_id
      and media_type = 'image';

    position_index := position_index + 1;
  end loop;
end;
$$;

revoke all
on function public.reorder_product_images(uuid, uuid[])
from public;

grant execute
on function public.reorder_product_images(uuid, uuid[])
to authenticated, postgres;
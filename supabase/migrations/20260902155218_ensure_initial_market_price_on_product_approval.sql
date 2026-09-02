create or replace function public.apply_product_moderation_decision()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  target_market_id uuid;
  approved_product_price numeric;
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
     and pg_catalog.btrim(coalesce(new.admin_note, '')) = '' then
    raise exception 'Product rejection requires an admin reason';
  end if;

  new.reviewed_at := pg_catalog.now();

  if new.status = 'approved' then
    update public.products p
    set lifecycle_status = 'published',
        updated_at = pg_catalog.now()
    where p.id = new.subject_id
      and p.archived_at is null
      and p.lifecycle_status = 'draft'
    returning p.price into approved_product_price;

    if not found then
      raise exception 'Product is not available for publication';
    end if;

    select m.id
      into target_market_id
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    join public.markets m on m.country_id = ap.country_id
    where p.id = new.subject_id
      and m.is_active = true
    order by m.created_at asc
    limit 1;

    if target_market_id is null then
      raise exception 'No active market exists for artisan country';
    end if;

    insert into public.product_market_prices (
      product_id,
      market_id,
      price,
      is_active,
      created_at,
      updated_at
    )
    values (
      new.subject_id,
      target_market_id,
      approved_product_price,
      true,
      pg_catalog.now(),
      pg_catalog.now()
    )
    on conflict (product_id, market_id) do nothing;
  end if;

  return new;
end;
$$;

insert into public.product_market_prices (
  product_id,
  market_id,
  price,
  is_active,
  created_at,
  updated_at
)
select
  p.id,
  m.id,
  p.price,
  true,
  pg_catalog.now(),
  pg_catalog.now()
from public.products p
join public.artisan_profiles ap on ap.id = p.artisan_id
join lateral (
  select market.id
  from public.markets market
  where market.country_id = ap.country_id
    and market.is_active = true
  order by market.created_at asc
  limit 1
) m on true
where p.lifecycle_status = 'published'
  and p.archived_at is null
  and not exists (
    select 1
    from public.product_market_prices pmp
    where pmp.product_id = p.id
      and pmp.market_id = m.id
  );
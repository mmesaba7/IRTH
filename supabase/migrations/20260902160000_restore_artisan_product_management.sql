alter table public.products
  add column if not exists archived_at timestamptz;

create index if not exists products_artisan_active_management_idx
  on public.products (artisan_id, created_at desc)
  where archived_at is null;

create or replace function public.update_own_product_content(
  target_product_id uuid,
  target_primary_craft_id uuid,
  target_name_ar text,
  target_name_en text,
  target_description_ar text,
  target_description_en text,
  target_story_ar text,
  target_story_en text,
  target_material_ar text,
  target_material_en text,
  target_dimensions text,
  target_weight text,
  target_preparation_time text,
  target_price numeric,
  target_quantity integer,
  target_made_to_order boolean,
  target_one_of_a_kind boolean,
  target_customization boolean
)
returns table (
  product_id uuid,
  lifecycle_status text,
  requires_review boolean
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  caller_id uuid := (select auth.uid());
  product_row public.products%rowtype;
  next_quantity integer;
  normalized_name_ar text := pg_catalog.btrim(coalesce(target_name_ar, ''));
  normalized_name_en text := pg_catalog.btrim(coalesce(target_name_en, ''));
  normalized_description_ar text := nullif(pg_catalog.btrim(coalesce(target_description_ar, '')), '');
  normalized_description_en text := nullif(pg_catalog.btrim(coalesce(target_description_en, '')), '');
  normalized_story_ar text := nullif(pg_catalog.btrim(coalesce(target_story_ar, '')), '');
  normalized_story_en text := nullif(pg_catalog.btrim(coalesce(target_story_en, '')), '');
  normalized_material_ar text := nullif(pg_catalog.btrim(coalesce(target_material_ar, '')), '');
  normalized_material_en text := nullif(pg_catalog.btrim(coalesce(target_material_en, '')), '');
  normalized_dimensions text := nullif(pg_catalog.btrim(coalesce(target_dimensions, '')), '');
  normalized_weight text := nullif(pg_catalog.btrim(coalesce(target_weight, '')), '');
  normalized_preparation_time text := nullif(pg_catalog.btrim(coalesce(target_preparation_time, '')), '');
  published_content_changed boolean;
begin
  if caller_id is null then
    raise exception 'not authorized';
  end if;

  select p.*
    into product_row
  from public.products p
  join public.artisan_profiles ap on ap.id = p.artisan_id
  where p.id = target_product_id
    and ap.auth_user_id = caller_id
    and ap.status = 'active'
  for update of p;

  if not found or product_row.archived_at is not null then
    raise exception 'product not found or unavailable';
  end if;

  if private.product_has_pending_publish_review(target_product_id) then
    raise exception 'product is pending review';
  end if;

  if normalized_name_ar = '' or normalized_name_en = '' then
    raise exception 'product names are required';
  end if;

  if target_primary_craft_id is null or not exists (
    select 1
    from public.crafts c
    where c.id = target_primary_craft_id
      and c.is_active = true
  ) then
    raise exception 'active craft is required';
  end if;

  if coalesce(target_made_to_order, false) and coalesce(target_one_of_a_kind, false) then
    raise exception 'inventory modes are mutually exclusive';
  end if;

  if target_price is null or target_price < 0 then
    raise exception 'price must be zero or greater';
  end if;

  if product_row.lifecycle_status = 'published' then
    published_content_changed :=
      product_row.primary_craft_id is distinct from target_primary_craft_id
      or product_row.name_ar is distinct from normalized_name_ar
      or product_row.name_en is distinct from normalized_name_en
      or product_row.description_ar is distinct from normalized_description_ar
      or product_row.description_en is distinct from normalized_description_en
      or product_row.story_ar is distinct from normalized_story_ar
      or product_row.story_en is distinct from normalized_story_en
      or product_row.material_ar is distinct from normalized_material_ar
      or product_row.material_en is distinct from normalized_material_en
      or product_row.dimensions is distinct from normalized_dimensions
      or product_row.weight is distinct from normalized_weight
      or product_row.preparation_time is distinct from normalized_preparation_time
      or product_row.made_to_order is distinct from coalesce(target_made_to_order, false)
      or product_row.one_of_a_kind is distinct from coalesce(target_one_of_a_kind, false)
      or product_row.customization is distinct from coalesce(target_customization, false);

    if not published_content_changed then
      return query select product_row.id, product_row.lifecycle_status, false;
      return;
    end if;

    if coalesce(target_made_to_order, false) then
      next_quantity := null;
    elsif coalesce(target_one_of_a_kind, false) then
      next_quantity := 1;
    elsif product_row.made_to_order or product_row.one_of_a_kind then
      if target_quantity is null or target_quantity < 0 then
        raise exception 'quantity must be zero or greater';
      end if;
      next_quantity := target_quantity;
    else
      next_quantity := product_row.quantity;
    end if;

    update public.products p
    set primary_craft_id = target_primary_craft_id,
        name_ar = normalized_name_ar,
        name_en = normalized_name_en,
        description_ar = normalized_description_ar,
        description_en = normalized_description_en,
        story_ar = normalized_story_ar,
        story_en = normalized_story_en,
        material_ar = normalized_material_ar,
        material_en = normalized_material_en,
        dimensions = normalized_dimensions,
        weight = normalized_weight,
        preparation_time = normalized_preparation_time,
        quantity = next_quantity,
        made_to_order = coalesce(target_made_to_order, false),
        one_of_a_kind = coalesce(target_one_of_a_kind, false),
        customization = coalesce(target_customization, false),
        lifecycle_status = 'draft',
        updated_at = pg_catalog.now()
    where p.id = target_product_id;

    return query select product_row.id, 'draft'::text, true;
    return;
  end if;

  if coalesce(target_made_to_order, false) then
    next_quantity := null;
  elsif coalesce(target_one_of_a_kind, false) then
    next_quantity := 1;
  else
    if target_quantity is null or target_quantity < 0 then
      raise exception 'quantity must be zero or greater';
    end if;
    next_quantity := target_quantity;
  end if;

  update public.products p
  set primary_craft_id = target_primary_craft_id,
      name_ar = normalized_name_ar,
      name_en = normalized_name_en,
      description_ar = normalized_description_ar,
      description_en = normalized_description_en,
      story_ar = normalized_story_ar,
      story_en = normalized_story_en,
      material_ar = normalized_material_ar,
      material_en = normalized_material_en,
      dimensions = normalized_dimensions,
      weight = normalized_weight,
      preparation_time = normalized_preparation_time,
      price = target_price,
      quantity = next_quantity,
      made_to_order = coalesce(target_made_to_order, false),
      one_of_a_kind = coalesce(target_one_of_a_kind, false),
      customization = coalesce(target_customization, false),
      updated_at = pg_catalog.now()
  where p.id = target_product_id
    and p.lifecycle_status = 'draft';

  if not found then
    raise exception 'product is not editable';
  end if;

  return query select product_row.id, 'draft'::text, false;
end;
$$;

revoke all on function public.update_own_product_content(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text, text,
  numeric, integer, boolean, boolean, boolean
) from public, anon, authenticated, service_role;
grant execute on function public.update_own_product_content(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text, text,
  numeric, integer, boolean, boolean, boolean
) to authenticated;

create or replace function public.archive_own_product(target_product_id uuid)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  caller_id uuid := (select auth.uid());
  owned_product_id uuid;
begin
  if caller_id is null then
    raise exception 'not authorized';
  end if;

  select p.id
    into owned_product_id
  from public.products p
  join public.artisan_profiles ap on ap.id = p.artisan_id
  where p.id = target_product_id
    and p.archived_at is null
    and ap.auth_user_id = caller_id
    and ap.status = 'active'
  for update of p;

  if not found then
    raise exception 'product not found or unavailable';
  end if;

  if private.product_has_pending_publish_review(target_product_id) then
    raise exception 'product is pending review';
  end if;

  update public.products p
  set lifecycle_status = 'draft',
      archived_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where p.id = target_product_id;

  return owned_product_id;
end;
$$;

revoke all on function public.archive_own_product(uuid) from public, anon, authenticated, service_role;
grant execute on function public.archive_own_product(uuid) to authenticated;

create or replace function private.update_own_product_inventory(
  target_product_id uuid,
  target_quantity integer
)
returns table(product_id uuid, quantity integer, updated_at timestamptz)
language plpgsql
security definer
set search_path to ''
as $$
declare
  caller_id uuid := (select auth.uid());
  product_row public.products%rowtype;
begin
  if caller_id is null then
    raise exception 'not authorized';
  end if;

  if target_quantity is null or target_quantity < 0 then
    raise exception 'quantity must be zero or greater';
  end if;

  select p.*
    into product_row
  from public.products p
  join public.artisan_profiles ap on ap.id = p.artisan_id
  where p.id = target_product_id
    and p.archived_at is null
    and ap.auth_user_id = caller_id
    and ap.status = 'active'
  for update of p;

  if not found then
    raise exception 'product not found or not owned by artisan';
  end if;

  if product_row.made_to_order or product_row.one_of_a_kind then
    raise exception 'manual quantity update is not available for this inventory mode';
  end if;

  return query
  update public.products p
  set quantity = target_quantity,
      updated_at = pg_catalog.now()
  where p.id = target_product_id
  returning p.id, p.quantity, p.updated_at;
end;
$$;

create or replace function private.mark_product_draft_on_artisan_media_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_product_id uuid;
begin
  target_product_id := case when tg_op = 'DELETE' then old.product_id else new.product_id end;

  if caller_id is not null and exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id = target_product_id
      and p.archived_at is null
      and p.lifecycle_status = 'published'
      and ap.auth_user_id = caller_id
  ) then
    update public.products p
    set lifecycle_status = 'draft',
        updated_at = pg_catalog.now()
    where p.id = target_product_id
      and p.lifecycle_status = 'published';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.mark_product_draft_on_artisan_media_change() from public, anon, authenticated, service_role;

drop trigger if exists product_media_artisan_change_requires_review on public.product_media;
create trigger product_media_artisan_change_requires_review
after insert or update or delete on public.product_media
for each row execute function private.mark_product_draft_on_artisan_media_change();

drop policy if exists "Artisans can create own draft products" on public.products;
create policy "Artisans can create own draft products"
on public.products for insert to authenticated
with check (
  lifecycle_status = 'draft'
  and published_at is null
  and archived_at is null
  and exists (
    select 1 from public.artisan_profiles ap
    where ap.id = products.artisan_id
      and ap.auth_user_id = (select auth.uid())
      and ap.status = 'active'
  )
  and exists (
    select 1 from public.crafts c
    where c.id = products.primary_craft_id
      and c.is_active = true
  )
);

drop policy if exists "Artisans can read own products" on public.products;
create policy "Artisans can read own products"
on public.products for select to authenticated
using (
  archived_at is null
  and exists (
    select 1 from public.artisan_profiles ap
    where ap.id = products.artisan_id
      and ap.auth_user_id = (select auth.uid())
  )
);

drop policy if exists "Artisans can update own editable draft products" on public.products;
create policy "Artisans can update own editable draft products"
on public.products for update to authenticated
using (
  archived_at is null
  and lifecycle_status = 'draft'
  and exists (
    select 1 from public.artisan_profiles ap
    where ap.id = products.artisan_id
      and ap.auth_user_id = (select auth.uid())
  )
  and not private.product_has_pending_publish_review(id)
)
with check (
  archived_at is null
  and lifecycle_status = 'draft'
  and exists (
    select 1 from public.artisan_profiles ap
    where ap.id = products.artisan_id
      and ap.auth_user_id = (select auth.uid())
  )
  and not private.product_has_pending_publish_review(id)
);

drop policy if exists "Public can read published products from active marketplace" on public.products;
create policy "Public can read published products from active marketplace"
on public.products for select to anon, authenticated
using (
  archived_at is null
  and lifecycle_status = 'published'
  and exists (
    select 1
    from public.artisan_profiles ap
    join public.countries co on co.id = ap.country_id
    where ap.id = products.artisan_id
      and ap.status = 'active'
      and co.is_active = true
  )
  and exists (
    select 1 from public.crafts c
    where c.id = products.primary_craft_id
      and c.is_active = true
  )
);

drop policy if exists "Artisans can submit own product moderation requests" on public.moderation_requests;
create policy "Artisans can submit own product moderation requests"
on public.moderation_requests for insert to authenticated
with check (
  subject_type = 'product'
  and action = 'publish'
  and status = 'pending'
  and requested_by = (select auth.uid())
  and reviewed_by is null
  and reviewed_at is null
  and admin_note is null
  and exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id = moderation_requests.subject_id
      and p.archived_at is null
      and p.lifecycle_status = 'draft'
      and ap.auth_user_id = (select auth.uid())
  )
);

drop policy if exists "Artisans can insert own product media" on public.product_media;
create policy "Artisans can insert own product media"
on public.product_media for insert to authenticated
with check (
  exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id = product_media.product_id
      and p.archived_at is null
      and ap.auth_user_id = (select auth.uid())
      and not private.product_has_pending_publish_review(p.id)
  )
);

drop policy if exists "Artisans can update own product media" on public.product_media;
create policy "Artisans can update own product media"
on public.product_media for update to authenticated
using (
  exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id = product_media.product_id
      and p.archived_at is null
      and ap.auth_user_id = (select auth.uid())
      and not private.product_has_pending_publish_review(p.id)
  )
)
with check (
  exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id = product_media.product_id
      and p.archived_at is null
      and ap.auth_user_id = (select auth.uid())
      and not private.product_has_pending_publish_review(p.id)
  )
);

drop policy if exists "Artisans can delete own product media" on public.product_media;
create policy "Artisans can delete own product media"
on public.product_media for delete to authenticated
using (
  exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id = product_media.product_id
      and p.archived_at is null
      and ap.auth_user_id = (select auth.uid())
      and not private.product_has_pending_publish_review(p.id)
  )
);

drop policy if exists "Artisans can read own product media" on public.product_media;
create policy "Artisans can read own product media"
on public.product_media for select to authenticated
using (
  exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    where p.id = product_media.product_id
      and p.archived_at is null
      and ap.auth_user_id = (select auth.uid())
  )
);

drop policy if exists "Public can read published product media from active marketplace" on public.product_media;
create policy "Public can read published product media from active marketplace"
on public.product_media for select to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    join public.artisan_profiles ap on ap.id = p.artisan_id
    join public.countries co on co.id = ap.country_id
    join public.crafts c on c.id = p.primary_craft_id
    where p.id = product_media.product_id
      and p.archived_at is null
      and p.lifecycle_status = 'published'
      and ap.status = 'active'
      and co.is_active = true
      and c.is_active = true
  )
);

create or replace function public.apply_product_moderation_decision()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
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
    update public.products
    set lifecycle_status = 'published',
        updated_at = pg_catalog.now()
    where id = new.subject_id
      and archived_at is null
      and lifecycle_status = 'draft';

    if not found then
      raise exception 'Product is not available for publication';
    end if;
  end if;

  return new;
end;
$$;
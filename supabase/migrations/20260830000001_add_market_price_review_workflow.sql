-- S15.1 — Market Price Review Workflow
--
-- Reuses the generic moderation_requests queue for artisan-proposed
-- market-specific prices. Live prices remain unchanged until approval.

alter table public.moderation_requests
  drop constraint moderation_requests_subject_type_check;

alter table public.moderation_requests
  add constraint moderation_requests_subject_type_check
  check (
    subject_type = any (
      array[
        'product'::text,
        'promotion'::text,
        'video'::text,
        'review_reply'::text,
        'artisan_craft_change'::text,
        'payout_details_change'::text,
        'product_market_price'::text
      ]
    )
  );

create unique index moderation_requests_one_pending_product_market_price_idx
  on public.moderation_requests (
    subject_id,
    ((proposed_data ->> 'market_id'))
  )
  where subject_type = 'product_market_price'
    and action = 'update'
    and status = 'pending';

create policy "Artisans can read own market price moderation requests"
on public.moderation_requests
for select
to authenticated
using (
  subject_type = 'product_market_price'
  and exists (
    select 1
    from public.products p
    join public.artisan_profiles ap
      on ap.id = p.artisan_id
    where p.id = moderation_requests.subject_id
      and ap.auth_user_id = (select auth.uid())
  )
);

create policy "Artisans can submit own market price moderation requests"
on public.moderation_requests
for insert
to authenticated
with check (
  subject_type = 'product_market_price'
  and action = 'update'
  and status = 'pending'
  and requested_by = (select auth.uid())
  and reviewed_by is null
  and reviewed_at is null
  and admin_note is null
  and proposed_data is not null
  and jsonb_typeof(proposed_data) = 'object'
  and proposed_data ? 'market_id'
  and proposed_data ? 'price'
  and (proposed_data ->> 'market_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (proposed_data ->> 'price') ~ '^[0-9]+([.][0-9]+)?$'
  and ((proposed_data ->> 'price')::numeric > 0)
  and exists (
    select 1
    from public.products p
    join public.artisan_profiles ap
      on ap.id = p.artisan_id
    where p.id = moderation_requests.subject_id
      and ap.auth_user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.markets m
    where m.id = (proposed_data ->> 'market_id')::uuid
  )
);

create or replace function private.review_product_market_price_request(
  target_request_id uuid,
  target_status text,
  target_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.moderation_requests%rowtype;
  target_market_id uuid;
  target_price numeric;
begin
  if not private.is_super_admin() then
    raise exception 'not authorized';
  end if;

  if target_status not in ('approved', 'rejected') then
    raise exception 'invalid review status';
  end if;

  select *
  into request_row
  from public.moderation_requests
  where id = target_request_id
  for update;

  if not found then
    raise exception 'moderation request not found';
  end if;

  if request_row.subject_type <> 'product_market_price'
     or request_row.action <> 'update' then
    raise exception 'invalid moderation request type';
  end if;

  if request_row.status <> 'pending' then
    raise exception 'moderation request already reviewed';
  end if;

  if request_row.proposed_data is null
     or jsonb_typeof(request_row.proposed_data) <> 'object'
     or not (request_row.proposed_data ? 'market_id')
     or not (request_row.proposed_data ? 'price') then
    raise exception 'invalid proposed price data';
  end if;

  begin
    target_market_id := (request_row.proposed_data ->> 'market_id')::uuid;
    target_price := (request_row.proposed_data ->> 'price')::numeric;
  exception
    when others then
      raise exception 'invalid proposed price data';
  end;

  if target_price <= 0 then
    raise exception 'price must be greater than zero';
  end if;

  if not exists (
    select 1
    from public.markets m
    where m.id = target_market_id
  ) then
    raise exception 'market not found';
  end if;

  if not exists (
    select 1
    from public.products p
    where p.id = request_row.subject_id
  ) then
    raise exception 'product not found';
  end if;

  if target_status = 'approved' then
    insert into public.product_market_prices (
      product_id,
      market_id,
      price,
      is_active,
      created_at,
      updated_at
    )
    values (
      request_row.subject_id,
      target_market_id,
      target_price,
      true,
      now(),
      now()
    )
    on conflict (product_id, market_id)
    do update
      set price = excluded.price,
          is_active = true,
          updated_at = now();
  end if;

  update public.moderation_requests
  set status = target_status,
      admin_note = target_admin_note,
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      updated_at = now()
  where id = target_request_id;
end;
$$;

revoke all on function private.review_product_market_price_request(uuid, text, text)
  from public;

grant execute on function private.review_product_market_price_request(uuid, text, text)
  to authenticated;

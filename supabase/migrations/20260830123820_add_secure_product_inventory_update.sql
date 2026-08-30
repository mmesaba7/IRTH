create or replace function private.update_own_product_inventory(
  target_product_id uuid,
  target_quantity integer
)
returns table (
  product_id uuid,
  quantity integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
begin
  caller_id := (select auth.uid());

  if caller_id is null then
    raise exception 'not authorized';
  end if;

  if target_quantity is null or target_quantity < 0 then
    raise exception 'quantity must be zero or greater';
  end if;

  if not exists (
    select 1
    from public.products p
    join public.artisan_profiles ap
      on ap.id = p.artisan_id
    where p.id = target_product_id
      and ap.auth_user_id = caller_id
  ) then
    raise exception 'product not found or not owned by artisan';
  end if;

  return query
  update public.products p
  set quantity = target_quantity,
      updated_at = now()
  where p.id = target_product_id
  returning p.id, p.quantity, p.updated_at;
end;
$$;

revoke all on function private.update_own_product_inventory(uuid, integer)
  from public;
revoke all on function private.update_own_product_inventory(uuid, integer)
  from anon;
grant execute on function private.update_own_product_inventory(uuid, integer)
  to authenticated;

create or replace function public.update_own_product_inventory(
  target_product_id uuid,
  target_quantity integer
)
returns table (
  product_id uuid,
  quantity integer,
  updated_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.update_own_product_inventory(target_product_id, target_quantity);
$$;

revoke all on function public.update_own_product_inventory(uuid, integer)
  from public;
revoke all on function public.update_own_product_inventory(uuid, integer)
  from anon;
grant execute on function public.update_own_product_inventory(uuid, integer)
  to authenticated;

create or replace function public.clear_customer_recently_viewed_products(p_user_id uuid)
returns void
language sql security definer set search_path='' as $$
  delete from private.customer_recently_viewed_products where user_id=p_user_id;
$$;
revoke all on function public.clear_customer_recently_viewed_products(uuid) from public,anon,authenticated,service_role;
grant execute on function public.clear_customer_recently_viewed_products(uuid) to service_role;

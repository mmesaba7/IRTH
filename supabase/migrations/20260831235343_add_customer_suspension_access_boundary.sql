create or replace function public.is_customer_account_suspended(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if p_user_id is null then return false; end if;
  return coalesce((
    select c.is_suspended
    from private.customer_account_controls c
    where c.customer_user_id = p_user_id
  ), false);
end;
$function$;

revoke all on function public.is_customer_account_suspended(uuid) from public, anon, authenticated;
grant execute on function public.is_customer_account_suspended(uuid) to service_role;
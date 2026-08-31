create or replace function public.get_market_return_window_settings(p_admin_user_id uuid)
returns table(market_id uuid,slug text,currency_code text,return_window_days integer)
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_super_admin_user(p_admin_user_id);
  return query
  select m.id,m.slug,m.currency_code,m.payout_return_hold_days
  from public.markets m
  where m.is_active=true
  order by m.slug;
end;$$;
revoke all on function public.get_market_return_window_settings(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_market_return_window_settings(uuid) to service_role;

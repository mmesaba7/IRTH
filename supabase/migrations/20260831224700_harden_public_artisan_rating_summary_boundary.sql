revoke all on function public.get_public_artisan_rating_summary() from public,anon,authenticated,service_role;
grant execute on function public.get_public_artisan_rating_summary() to service_role;

revoke all on function public.get_published_product_reviews(text) from public,anon,authenticated,service_role;
grant execute on function public.get_published_product_reviews(text) to service_role;

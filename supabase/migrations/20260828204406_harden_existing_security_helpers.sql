alter function public.enforce_max_product_shopping_categories()
set search_path = '';

alter function public.enforce_single_super_admin()
set search_path = '';

revoke execute on function public.rls_auto_enable()
from public, anon, authenticated, service_role;;

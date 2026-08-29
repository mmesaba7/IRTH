alter function public.apply_product_moderation_decision()
security definer;

revoke execute on function public.apply_product_moderation_decision()
from public, anon, authenticated, service_role;;

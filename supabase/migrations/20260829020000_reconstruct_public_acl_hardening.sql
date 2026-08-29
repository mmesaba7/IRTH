alter default privileges for role postgres in schema public
revoke all on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
revoke all on functions from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
revoke all on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
grant maintain on tables to anon, authenticated;

alter default privileges for role postgres in schema public
grant maintain, references, trigger, truncate on tables to service_role;
revoke all
on function public.enforce_max_product_shopping_categories()
from anon, authenticated, service_role;

revoke all
on function public.enforce_product_media_limits()
from anon, authenticated, service_role;

revoke all
on function public.enforce_single_super_admin()
from anon, authenticated, service_role;

revoke all
on function public.reorder_product_images(uuid, uuid[])
from anon, service_role;

revoke all
on function public.rls_auto_enable()
from anon, authenticated, service_role;

grant execute
on function public.reorder_product_images(uuid, uuid[])
to authenticated;
-- Marketplace and product table privileges
revoke all
on function public.create_irth_promotion(
  text,
  numeric,
  timestamp with time zone,
  timestamp with time zone,
  uuid[]
)
from service_role;

revoke all
on function public.get_active_promotions()
from service_role;

revoke all
on function public.review_artisan_promotion(
  uuid,
  text,
  text
)
from service_role;

revoke all
on function public.set_promotion_enabled(
  uuid,
  boolean
)
from service_role;

revoke all
on function public.submit_artisan_promotion(
  text,
  numeric,
  timestamp with time zone,
  timestamp with time zone,
  uuid[]
)
from service_role;

revoke all on table public.artisan_crafts
from anon, authenticated, service_role;

grant select, maintain on table public.artisan_crafts
to anon, authenticated;

grant maintain, references, trigger, truncate on table public.artisan_crafts
to service_role;


revoke all on table public.artisan_profiles
from anon, authenticated, service_role;

grant maintain on table public.artisan_profiles
to anon;

grant select, maintain on table public.artisan_profiles
to authenticated;

grant maintain, references, trigger, truncate on table public.artisan_profiles
to service_role;


revoke all on table public.countries
from anon, authenticated, service_role;

grant select, maintain on table public.countries
to anon, authenticated;

grant maintain, references, trigger, truncate on table public.countries
to service_role;


revoke all on table public.crafts
from anon, authenticated, service_role;

grant select, maintain on table public.crafts
to anon, authenticated;

grant maintain, references, trigger, truncate on table public.crafts
to service_role;


revoke all on table public.moderation_requests
from anon, authenticated, service_role;

grant maintain on table public.moderation_requests
to anon;

grant insert, select, update, maintain on table public.moderation_requests
to authenticated;

grant maintain, references, trigger, truncate on table public.moderation_requests
to service_role;


revoke all on table public.product_media
from anon, authenticated, service_role;

grant select, maintain on table public.product_media
to anon;

grant insert, select, update, delete, maintain on table public.product_media
to authenticated;

grant maintain, references, trigger, truncate on table public.product_media
to service_role;


revoke all on table public.product_shopping_categories
from anon, authenticated, service_role;

grant select, maintain on table public.product_shopping_categories
to anon, authenticated;

grant maintain, references, trigger, truncate on table public.product_shopping_categories
to service_role;


revoke all on table public.products
from anon, authenticated, service_role;

grant select, maintain on table public.products
to anon;

grant select, update, maintain on table public.products
to authenticated;

grant maintain, references, trigger, truncate on table public.products
to service_role;
-- Promotion, identity, and category table privileges

revoke all on table public.promotion_products
from anon, authenticated, service_role;

grant select on table public.promotion_products
to authenticated;

grant maintain, references, trigger, truncate on table public.promotion_products
to service_role;


revoke all on table public.promotions
from anon, authenticated, service_role;

grant select, update on table public.promotions
to authenticated;

grant maintain, references, trigger, truncate on table public.promotions
to service_role;


revoke all on table public.roles
from anon, authenticated, service_role;

grant maintain on table public.roles
to anon;

grant select, maintain on table public.roles
to authenticated;

grant maintain, references, trigger, truncate on table public.roles
to service_role;


revoke all on table public.shopping_categories
from anon, authenticated, service_role;

grant select, maintain on table public.shopping_categories
to anon, authenticated;

grant maintain, references, trigger, truncate on table public.shopping_categories
to service_role;


revoke all on table public.user_accounts
from anon, authenticated, service_role;

grant maintain on table public.user_accounts
to anon;

grant insert, select, update, maintain on table public.user_accounts
to authenticated;

grant maintain, references, trigger, truncate on table public.user_accounts
to service_role;

revoke all on table public.artisan_profiles
from anon, authenticated, service_role;

grant maintain on table public.artisan_profiles
to anon;

grant select (
  id,
  slug,
  name_ar,
  name_en,
  country_id,
  region_ar,
  region_en,
  bio_ar,
  bio_en,
  story_ar,
  story_en,
  primary_craft_id,
  profile_image_url,
  video_url,
  status,
  created_at,
  updated_at
) on table public.artisan_profiles
to anon;

grant select, maintain on table public.artisan_profiles
to authenticated;

grant maintain, references, trigger, truncate on table public.artisan_profiles
to service_role;
revoke all on table public.user_roles
from anon, authenticated, service_role;

grant maintain on table public.user_roles
to anon;

grant insert, select, maintain on table public.user_roles
to authenticated;

grant maintain, references, trigger, truncate on table public.user_roles
to service_role;
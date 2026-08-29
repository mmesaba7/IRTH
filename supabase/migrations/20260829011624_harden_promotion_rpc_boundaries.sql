alter function public.submit_artisan_promotion(text, numeric, timestamptz, timestamptz, uuid[]) set schema private;
alter function public.create_irth_promotion(text, numeric, timestamptz, timestamptz, uuid[]) set schema private;
alter function public.review_artisan_promotion(uuid, text, text) set schema private;
alter function public.set_promotion_enabled(uuid, boolean) set schema private;
alter function public.get_active_promotions() set schema private;

grant usage on schema private to anon, authenticated;

revoke execute on function private.submit_artisan_promotion(text, numeric, timestamptz, timestamptz, uuid[]) from public, anon;
grant execute on function private.submit_artisan_promotion(text, numeric, timestamptz, timestamptz, uuid[]) to authenticated;

revoke execute on function private.create_irth_promotion(text, numeric, timestamptz, timestamptz, uuid[]) from public, anon;
grant execute on function private.create_irth_promotion(text, numeric, timestamptz, timestamptz, uuid[]) to authenticated;

revoke execute on function private.review_artisan_promotion(uuid, text, text) from public, anon;
grant execute on function private.review_artisan_promotion(uuid, text, text) to authenticated;

revoke execute on function private.set_promotion_enabled(uuid, boolean) from public, anon;
grant execute on function private.set_promotion_enabled(uuid, boolean) to authenticated;

revoke execute on function private.get_active_promotions() from public;
grant execute on function private.get_active_promotions() to anon, authenticated;

create function public.submit_artisan_promotion(
  p_discount_type text,
  p_discount_value numeric,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_product_ids uuid[]
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.submit_artisan_promotion(
    p_discount_type,
    p_discount_value,
    p_start_at,
    p_end_at,
    p_product_ids
  );
$$;

create function public.create_irth_promotion(
  p_discount_type text,
  p_discount_value numeric,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_product_ids uuid[]
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_irth_promotion(
    p_discount_type,
    p_discount_value,
    p_start_at,
    p_end_at,
    p_product_ids
  );
$$;

create function public.review_artisan_promotion(
  p_promotion_id uuid,
  p_decision text,
  p_admin_note text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.review_artisan_promotion(
    p_promotion_id,
    p_decision,
    p_admin_note
  );
$$;

create function public.set_promotion_enabled(
  p_promotion_id uuid,
  p_is_enabled boolean
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_promotion_enabled(
    p_promotion_id,
    p_is_enabled
  );
$$;

create function public.get_active_promotions()
returns table (
  promotion_id uuid,
  source_type text,
  discount_type text,
  discount_value numeric,
  start_at timestamptz,
  end_at timestamptz,
  product_id uuid,
  product_slug text,
  product_name_ar text,
  product_name_en text,
  product_price numeric,
  artisan_slug text,
  artisan_name_ar text,
  artisan_name_en text,
  craft_name_ar text,
  craft_name_en text,
  country_name_ar text,
  country_name_en text
)
language sql
security invoker
stable
set search_path = ''
as $$
  select * from private.get_active_promotions();
$$;

revoke execute on function public.submit_artisan_promotion(text, numeric, timestamptz, timestamptz, uuid[]) from public, anon;
grant execute on function public.submit_artisan_promotion(text, numeric, timestamptz, timestamptz, uuid[]) to authenticated;

revoke execute on function public.create_irth_promotion(text, numeric, timestamptz, timestamptz, uuid[]) from public, anon;
grant execute on function public.create_irth_promotion(text, numeric, timestamptz, timestamptz, uuid[]) to authenticated;

revoke execute on function public.review_artisan_promotion(uuid, text, text) from public, anon;
grant execute on function public.review_artisan_promotion(uuid, text, text) to authenticated;

revoke execute on function public.set_promotion_enabled(uuid, boolean) from public, anon;
grant execute on function public.set_promotion_enabled(uuid, boolean) to authenticated;

revoke execute on function public.get_active_promotions() from public;
grant execute on function public.get_active_promotions() to anon, authenticated;;

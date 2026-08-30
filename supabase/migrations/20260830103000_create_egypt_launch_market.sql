-- S15.2 — Create the first approved IRTH launch market
--
-- Approved decision: Egypt is the first operational Market.
-- Market remains a separate entity from Country.
-- Legacy products.price is intentionally untouched.

DO $$
DECLARE
  egypt_country_id uuid;
BEGIN
  SELECT id
  INTO egypt_country_id
  FROM public.countries
  WHERE iso_code = 'EG';

  IF egypt_country_id IS NULL THEN
    RAISE EXCEPTION 'Egypt country row with iso_code EG is required before creating the Egypt market';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.markets
    WHERE slug = 'egypt'
  ) THEN
    RAISE EXCEPTION 'Egypt market already exists';
  END IF;

  INSERT INTO public.markets (
    country_id,
    slug,
    currency_code,
    is_active
  )
  VALUES (
    egypt_country_id,
    'egypt',
    'EGP',
    true
  );
END;
$$;

-- S15.4.1 — Promotion Market Scope
--
-- Prepare Promotions for market-aware commerce.
--
-- Important:
-- Existing Promotions are NOT automatically assigned to Egypt
-- or to any other Market.
--
-- They remain unscoped until explicitly migrated/reviewed.

alter table public.promotions
  add column market_id uuid null
    references public.markets(id)
    on delete restrict;


-- Promotion money must not be globally restricted to 2 decimal places.
-- Currency-specific rounding belongs to the commerce calculation layer.

alter table public.promotions
  alter column discount_value type numeric;


create index promotions_market_id_idx
  on public.promotions(market_id);


create index promotions_market_active_window_idx
  on public.promotions(
    market_id,
    approval_status,
    is_enabled,
    start_at,
    end_at
  );
  
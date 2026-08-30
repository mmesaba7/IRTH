-- S15.4.3 follow-up — cover coupons.created_by foreign key.
--
-- Supabase's performance advisor flagged coupons_created_by_fkey as unindexed.
-- This index supports lookups and FK maintenance without changing coupon behavior.

create index coupons_created_by_idx
  on public.coupons(created_by)
  where created_by is not null;

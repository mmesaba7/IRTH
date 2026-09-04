-- Restore the narrow server-side read dependency used by customer/guest tracking.
-- The customer tracking payload builder now includes review metadata from
-- private.customer_reviews. Guest tracking executes through the server-side
-- service_role boundary, so that role needs SELECT on this private dependency.
-- No browser/client role receives access.

grant select on table private.customer_reviews to service_role;

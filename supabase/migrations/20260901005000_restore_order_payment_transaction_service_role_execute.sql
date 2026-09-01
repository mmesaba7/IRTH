-- Restore the narrow server-only execution boundary for order + payment creation.
-- The customization migration recreated the private function and left service_role
-- without EXECUTE, which caused the Next.js order API to fail with permission denied.

grant execute on function private.create_order_with_payment_transaction(
  jsonb,
  jsonb,
  jsonb,
  text,
  text,
  text,
  text
) to service_role;

revoke execute on function private.create_order_with_payment_transaction(
  jsonb,
  jsonb,
  jsonb,
  text,
  text,
  text,
  text
) from anon, authenticated;

-- S15.4.6 correction: the public SECURITY INVOKER wrapper executes the
-- private SECURITY DEFINER implementation as the caller. Therefore anon and
-- authenticated need USAGE on private plus EXECUTE on this exact function.
-- General PUBLIC execution remains revoked, and the private schema is not
-- exposed through the Data API.
grant usage on schema private to anon, authenticated;
grant execute on function private.get_applicable_coupon(uuid, text, uuid[])
  to anon, authenticated;
revoke execute on function private.get_applicable_coupon(uuid, text, uuid[])
  from public;

revoke all on function private.get_applicable_coupon(uuid, text, uuid[]) from public;
revoke all on function private.get_applicable_coupon(uuid, text, uuid[]) from anon;
revoke all on function private.get_applicable_coupon(uuid, text, uuid[]) from authenticated;
grant execute on function private.get_applicable_coupon(uuid, text, uuid[]) to service_role;

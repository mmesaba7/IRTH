revoke all on function private.assert_customer_account_active(uuid) from public;
revoke all on function private.assert_customer_account_active(uuid) from anon;
revoke all on function private.assert_customer_account_active(uuid) from authenticated;

revoke all on function private.require_customer_role_user(uuid) from public;
revoke all on function private.require_customer_role_user(uuid) from anon;
revoke all on function private.require_customer_role_user(uuid) from authenticated;

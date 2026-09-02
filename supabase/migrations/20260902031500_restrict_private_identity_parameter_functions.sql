-- Private implementation functions below accept explicit user/admin identifiers.
-- They are reached through trusted public/server boundaries and must not be
-- directly executable by browser-facing roles.

revoke execute on function private.set_market_return_window_days(uuid, integer, uuid, text)
from public, anon, authenticated;

revoke execute on function private.review_customer_review(uuid, uuid, text, text)
from public, anon, authenticated;

revoke execute on function private.review_artisan_reply(uuid, uuid, text, text)
from public, anon, authenticated;

revoke execute on function private.submit_artisan_review_reply(uuid, uuid, uuid, text)
from public, anon, authenticated;

revoke execute on function private.create_verified_purchase_review(uuid, uuid, text, smallint, smallint, text)
from public, anon, authenticated;

revoke execute on function private.edit_verified_purchase_review(uuid, uuid, text, smallint, smallint, text)
from public, anon, authenticated;

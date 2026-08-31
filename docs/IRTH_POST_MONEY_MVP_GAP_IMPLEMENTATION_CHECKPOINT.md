# IRTH — Post-Money MVP Gap Implementation Checkpoint

**Date:** 31 August 2026  
**Status:** Implemented in Live Supabase + GitHub; application Build / Browser E2E pending.

## Owner-approved decisions implemented

### Reviews
- One Review per Order Item regardless of quantity.
- A later separate purchase creates a new Order Item and may receive its own Review.
- Review requires a real delivered purchase.
- Customer rates Product and Artisan.
- Customer may edit once only.
- Review content is Pending IRTH Review before publication.
- Artisan may reply only to a published Review.
- Artisan reply is Pending IRTH Review before publication.
- Customer direct contact information is never exposed to the Artisan.
- Guest-purchase Review is supported through the secure guest-order credential boundary.

### Return Window
- Egypt initial Return Window = 14 days.
- Super Admin may change the Market setting from the Admin Settings UI.
- The value active at each Artisan Shipment delivery is snapshotted on that Shipment.
- Later configuration changes are not retroactive.
- Payout eligibility and Return-window enforcement now use the Shipment snapshot, not the current Market value.
- Configuration changes are audit logged.

### Wholesale
- General Wholesale page.
- Product-specific Wholesale entry from Product page.
- Both flow into one IRTH-only backend.
- Contact information is private and never exposed to an Artisan.
- Super Admin has a private Wholesale inbox and may close/reopen requests with an internal note.
- Super Admin receives an in-app notification without customer-contact PII in the notification body.

## Database migrations

- `20260831190751_create_verified_purchase_review_foundation.sql`
- `20260831190959_snapshot_dynamic_return_window_on_delivery.sql`
- `20260831191224_create_private_wholesale_request_foundation.sql`
- `20260831191426_wire_review_read_models_and_customer_order_items.sql`
- `20260831191639_add_admin_return_window_read_boundary.sql`
- `20260831192659_harden_published_review_rpc_boundary.sql`
- `20260831192731_harden_review_return_wholesale_fk_indexes.sql`

## Security boundaries

- Review and Wholesale source-of-truth tables live in `private`.
- Direct table access is revoked from public / anon / authenticated / service_role.
- Narrow public RPC wrappers are executable by service_role only unless deliberately public; published Product Review read was hardened to service_role only and exposed to the browser through Next.js API.
- Customer Review writes derive authenticated customer identity server-side or verify the secure Guest credential hash.
- Artisan Review reads/replies derive the authenticated Artisan profile server-side and re-check ownership in the DB.
- Admin moderation / Return Settings / Wholesale inbox verify Super Admin in trusted RPCs.
- Sensitive mutation routes use same-origin checks.
- Guest tracking/review credential remains in a URL fragment initially, is removed from the address bar immediately, and remains only in client memory for the session.
- Wholesale notifications contain no customer-contact PII.

## Controlled tests completed

### Review lifecycle
Rollback-safe test passed:
- verified delivered purchase creates Review
- duplicate Review for same Order Item blocked
- Admin approval publishes Review
- correct Artisan may submit reply
- Admin approval publishes reply
- customer one-time edit returns Review to pending moderation
- previous approved Artisan reply is hidden after edited Review
- second customer edit blocked
- rollback left 0 Review / Reply / Event / Media test rows

### Return configuration snapshot
Rollback-safe test changed Market 14 → 30 days and confirmed an already-delivered Shipment remained snapshotted at 14 days. Rollback restored Market to 14 and left no audit test row.

### Wholesale lifecycle
Rollback-safe test passed Create → Super Admin notification → Close; rollback left 0 Wholesale test rows and 0 Wholesale test notifications.

## Advisor postflight

- New authenticated-executable SECURITY DEFINER warning initially detected for published Review read RPC and was immediately removed by hardening that RPC to service_role-only.
- Security Advisor after hardening shows no new Review / Return Window / Wholesale warning. Existing project debt remains separately tracked.
- New Review / Return / Wholesale unindexed FK findings were remediated. Remaining unindexed-FK findings are pre-existing outside this work.

References:
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

## Application work implemented

- Real Customer Review API + UI.
- Real Product published Review API + Product page review display.
- Real Artisan Review dashboard + moderated reply submit.
- Real Admin Review moderation queue.
- My Orders now carries trusted Order Item IDs, delivery state, Review state, and Return Window snapshot.
- Guest secure tracking can enter the Review flow without persisting the Guest credential.
- Dynamic Return Window Admin Settings panel.
- General Wholesale page.
- Product-specific Wholesale page and Product-page entry.
- IRTH-only Admin Wholesale inbox.
- General Wholesale navigation entry.
- Legacy Review edit route no longer uses localStorage and redirects to the trusted Review flow.

## Pending before closure

1. `npm.cmd run build` on the owner's local application checkout.
2. Browser E2E for Customer Review → Admin approve → Product display → Artisan reply → Admin approve.
3. Browser E2E for Return Window Admin Settings showing 14 and a controlled change/revert if desired.
4. Browser E2E for General and Product Wholesale → Admin inbox.
5. Review image upload limits require owner approval. Specification requires optional customer images with IRTH moderation, but does not define technical count/size limits.

Recommended Review image limits (proposal, not yet approved):
- maximum 4 images per Review
- maximum 5 MB per image
- JPEG / PNG / WebP only
- Private Supabase Storage
- no public appearance until IRTH approval

Do not mark this implementation CLOSED until Build and Browser E2E succeed and the Review-image technical limit decision is resolved.

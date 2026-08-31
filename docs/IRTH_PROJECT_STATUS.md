# IRTH Project Status

**Project:** IRTH  
**Document Purpose:** Current implementation status of the IRTH MVP  
**Last Updated:** 31 August 2026

---

# 1. Source of Truth

This document answers:

> **Where are we in the IRTH MVP right now?**

Priority remains:

1. **IRTH MVP Specification v0.1** — source of truth for approved Product / Architecture decisions.
2. **IRTH_PROJECT_STATUS.md** — source of truth for actual implementation / test status.
3. **Git repository** — source of truth for application code and migration files.
4. **Live Supabase** — source of truth for currently running database state.

If this Status document conflicts with the Specification on a Product decision, the Specification wins unless the owner explicitly approves a change.

---

# 2. Core Architecture

Approved architecture:

```text
Next.js
+
TypeScript
+
Supabase / PostgreSQL
+
Modular Monolith
```

MVP does not use Microservices.

Core rule:

> Build simple, but build it correctly.

Payment, Shipping and Notification remain separate layers.

---

# 3. Overall MVP Progress

```text
Foundation                  ✅ Core implemented
Identity & Structure        🟨 Mostly implemented
Marketplace                 ✅ Core implemented
Shopping                    ✅ Trusted Checkout + real Order creation foundation
Orders                      🟨 Real Order / Artisan / Admin / status foundation implemented
Shipping                    🟨 Real manual Shipment lifecycle implemented; Courier integration later
Tracking                    🟨 Admin metadata implemented + verified; final Production Build pending
Money                       🟨 Pricing + Promotions + Coupons + Commission snapshot real; Payment/Payout later
Testing & Final Polish      ⬜ Later
```

Current major position:

```text
Marketplace / Discovery         ✅
Secure Shopping                 ✅ core
Transactional Orders            ✅ core
Artisan Fulfillment             ✅ core
Admin Order Management          ✅ read + confirmation
Shipping Status                 ✅ manual MVP foundation
Tracking Metadata               ← CURRENT CLOSURE GATE
Customer / Guest Tracking       NEXT
Notifications                   LATER
Payments                        SEPARATE LAYER
```

---

# 4. Closed Milestones

## S12 — Product Foundations

### S12.1 Inventory Foundation — CLOSED ✅

- Finite stock foundation.
- Made-to-Order / one-of-a-kind modes.
- Secure inventory update boundary.

### S12.2 Media Foundation — CLOSED ✅

- Image / Video upload.
- Private Storage + Signed URLs.
- Delete / reorder / cover.
- TUS resumable upload.
- Final media RLS / Security review.

---

## S13 — Product Approval Workflow — CLOSED ✅

```text
Artisan Draft
↓
Submit
↓
Super Admin Review
↓
Approve / Reject
```

Non-published Products remain unavailable publicly.

---

## S14 — Public Marketplace DB Integration — CLOSED ✅

Public visibility chain is real:

```text
Country Active
↓
Craft Active
↓
Artisan Active
↓
Product Published
↓
Public Marketplace
```

---

## S15.0 — Database Migration Reconciliation — CLOSED ✅

Live / Git migration state was reconciled and required security state reconstructed.

---

## S15.1 — Market & Pricing Foundation — CLOSED ✅

- Country != Market.
- Product prices are Market-specific.
- No automatic FX conversion.
- Artisan price proposals use moderation.
- Egypt Launch Market is active using EGP.

---

## S15.2 — Market Selection — CLOSED ✅

- Active Market API.
- Cookie-backed Market selection.
- Geo is suggestion-only.
- Customer manually confirms / changes Market.

---

## S15.3 — Secure Cart / Server Quote — CLOSED ✅

Browser stores intent only. Server remains authoritative for:

- Product availability.
- Market Price.
- Inventory.
- Trusted line totals.

---

## S15.4 — Promotions + Coupons — CLOSED ✅

Includes:

- Market-scoped Promotions.
- Best Promotion calculation.
- Coupon DB foundation.
- Stackable / non-stackable Coupon logic.
- Exact money arithmetic + Round Half-Up.
- Cart Coupon UX.
- Security / edge integration review.

Decision register:

```text
docs/IRTH_S15_4_DECISION_REGISTER.md
```

---

## S15.5.1 — Trusted Checkout Summary — CLOSED ✅

Checkout summary is server-authoritative.

---

## S15.5.2 — Customer Details + Guest Checkout Foundation — CLOSED ✅

- Guest Checkout supported.
- Customer account optional.
- Customer PII not persisted to local/session storage.
- Market-locked delivery country.
- Server customer validation.

---

## S15.5.3 — Shipping / Final Total Boundary — CLOSED ✅

Approved Egypt shipping rule:

```text
Flat shipping fee:       150 EGP
Free shipping threshold: 2000 EGP
```

Threshold basis:

> trusted merchandise subtotal after Promotions + Coupon.

Shipping is charged once per unified Order.

Missing Market shipping config fails closed.

---

## S15.5.4 — Transactional Order Creation — CLOSED ✅

Real transactional Order foundation exists:

```text
orders
order_customer_details
order_artisan_groups
order_items
shipments
order_status_history
```

Important verified behavior:

- One Customer Order.
- Internal Artisan split.
- Historical Product / Money snapshots.
- Atomic stock revalidation + decrement.
- Idempotent Order creation.
- Coupon Redemption inside secure transaction.
- Commission rate snapshot at sale.
- Guest Customer supported.
- Payment status separated from Order status.

Closure record:

```text
docs/IRTH_S15_5_4_CLOSURE.md
```

---

## Artisan Order Read Foundation — CLOSED ✅

Artisan `/artisan/orders` now reads real Orders from Supabase.

Privacy boundary verified:

Artisan does NOT receive:

- Customer email.
- Customer phone.
- Full delivery address.
- Direct contact information.

---

## Secure Artisan Fulfillment Actions — CLOSED ✅

Allowed Artisan transitions:

```text
received / confirmed
↓
preparing
↓
ready_for_courier_pickup
```

All transitions are server-validated and audited in:

```text
order_artisan_group_status_history
```

Closure record:

```text
docs/IRTH_ARTISAN_FULFILLMENT_CLOSURE.md
```

---

## Admin Order Read Foundation — CLOSED ✅

`/dashboard-admin/orders` reads real unified Orders from Supabase.

Super Admin can see operational Customer / delivery data.

Database authorization rejects non-Super-Admin users with `admin_required`.

Closure record:

```text
docs/IRTH_ADMIN_ORDER_READ_CLOSURE.md
```

---

## Admin Order + Shipping Status Foundation — CLOSED ✅

Approved / implemented lifecycle:

```text
Order:
received
↓
confirmed
↓
aggregated from Artisan Groups / Shipments

Shipment:
pending
↓
picked_up_from_artisan
↓
in_transit
↓
delivered
```

Exceptional Shipment status:

```text
delivery_failed
```

Implemented:

- Super Admin Order confirmation.
- Conservative Order aggregation.
- One Shipment per Artisan Group in MVP.
- Automatic Shipment creation when group becomes ready.
- Manual Super Admin Shipment status actions.
- `shipment_status_history` audit trail.
- `delivered_at` / `shipped_at` lifecycle timestamps.
- Order Status remains separate from Payment Status.

Closure record:

```text
docs/IRTH_ADMIN_ORDER_SHIPPING_CLOSURE.md
```

---

# 5. Tracking Metadata Foundation

**Status: IMPLEMENTED + BROWSER / DB / SECURITY VERIFIED 🟨**  
**Final closure gate:** latest Production Build result still needs to be recorded.

Migration:

```text
supabase/migrations/20260831094605_create_admin_tracking_metadata_foundation.sql
```

Implemented:

- `courier_code` editing.
- `tracking_number` editing.
- `tracking_url` editing.
- HTTPS-only Tracking URL validation.
- `shipment_tracking_history` audit table.
- Idempotent identical save.
- Super Admin-only authorization.
- Public `SECURITY INVOKER` RPC wrapper.
- Private `SECURITY DEFINER` implementation with explicit `private.is_super_admin()` check.

Verification record:

```text
docs/IRTH_TRACKING_METADATA_VERIFICATION.md
```

## Live browser / DB verification

Test Order:

```text
IRTH-20260830-782EBA88
```

Current verified state:

```text
Order status:      delivered
Payment status:    pending
Shipment status:   delivered
Courier code:      test_courier
Tracking number:   TEST-12345
Tracking URL:      https://example.com/track/TEST-12345
Tracking history:  1 row
```

The Admin UI showed the saved Tracking data and the second identical save returned:

```text
بيانات التتبع لم تتغير.
```

Live DB confirmed exactly one Tracking-history row, proving idempotency.

The values above are test metadata, not an approved production Courier configuration.

---

# 6. Current Order / Shipping Architecture

Customer-facing conceptual structure remains:

```text
ONE Customer Order
        ↓
Artisan Groups
        ↓
Shipments
```

Order status is not a free Admin dropdown.

Order aggregation is server-controlled.

Artisan controls only preparation transitions.

IRTH / Courier-side logic controls shipment transitions.

---

# 7. Customer Tracking — NEXT

Next planned MVP task after the Tracking Metadata Production Build passes:

```text
Customer Tracking View
+
Secure Guest Tracking Link
```

Approved direction:

### Authenticated Customer

Customer may read only their own Order / Tracking data.

### Guest Customer

Guest access must NOT use Order Number alone as authorization.

Approved direction:

```text
Opaque high-entropy Guest Access Token
↓
raw token delivered to customer
↓
only token hash stored server-side
↓
secure Order / Tracking lookup
```

The current Order schema already has `guest_access_token_hash`, but the usable Guest Tracking link / raw token delivery flow is not implemented yet.

---

# 8. Money Status

## Commission

Real foundation exists ✅

Approved launch default:

```text
15% for all current Crafts
0 Artisan overrides currently
```

Each Order Item stores the applied commission rate historically.

Exact Commission Amount calculation / payout accounting is not yet implemented.

## Payment

**Status: NOT IMPLEMENTED ⬜**

Payment Layer stays separate from Checkout / Order.

Current test Order correctly remains:

```text
payment_status = pending
```

First Payment Gateway is not yet approved.

## Payout

**Status: NOT IMPLEMENTED ⬜**

Approved sequence remains:

```text
Sale
↓
Delivery
↓
Return period ends
↓
Eligible
↓
Payout Cycle
```

---

# 9. Returns / Refunds

**Status: REQUIRED BY MVP / DETAILED WORKFLOW LATER 🟨**

Architecture remains ready for later Return / Refund workflow.

Still unresolved:

- Final Return Window.
- Return Shipping Responsibility.
- Detailed Refund engine.

---

# 10. Security / Privacy Snapshot

Customer privacy remains a core Business Rule.

Artisan must never receive:

- Phone.
- Email.
- WhatsApp.
- Full Address.
- Direct Customer contact data.

Important implemented security patterns:

```text
Browser
↓
Next.js Server / authenticated Supabase client
↓
public SECURITY INVOKER RPC
↓
private SECURITY DEFINER helper when privileged access is genuinely required
↓
explicit authorization inside private function
```

No Supabase secret/service key is exposed to the Browser.

Known unrelated existing Security Advisor warnings remain:

1. Legacy `public.review_product_market_price_request(...)` SECURITY DEFINER exposure pattern needs a later dedicated hardening pass.
2. Supabase Leaked Password Protection is disabled.
3. Audit history tables intentionally have RLS enabled with no direct Browser policies, which produces informational `rls_enabled_no_policy` Advisor notices.

---

# 11. Known Technical Debt / Gaps

- Admin Login authenticates a user but the Login page itself does not enforce Super Admin before redirect; sensitive Admin Order / Shipping RPCs are nevertheless protected at the database boundary. Broader Admin route authorization cleanup remains technical debt.
- Customer `/account/orders` still needs reconciliation with the new real Orders / Tracking foundation.
- Guest Tracking link / usable raw Guest token is not implemented yet.
- First Courier is not approved.
- First Payment Gateway is not approved.
- Notification Layer remains prototype / later.
- Reviews still need real verified-purchase integration on top of delivered Orders.
- Payout execution is not implemented.
- Full bilingual QA remains incomplete.
- Search v0.1 is partial.
- Legacy `products.price` must never be trusted for Market-aware commerce.
- A single transient `/api/markets` 500 was observed once during local development and then immediately returned 200 on retry; it is non-blocking unless reproduced.

---

# 12. Approved Decisions — Do Not Reopen Without Reason

- Handmade / heritage Marketplace.
- Arabic + English; RTL / LTR.
- Mobile-First responsive UX.
- Craft is a primary Shop entry.
- Explore may start from Country.
- Guest Checkout supported.
- Customer account optional during purchase.
- One Customer Order with internal Artisan / Shipment split.
- Artisan cannot see sensitive Customer contact data.
- Product Approval in MVP.
- Artisan Promotions require IRTH approval.
- Reviews require verified delivered purchase.
- One Super Admin in MVP.
- Commission by Craft with optional Artisan override.
- Launch commission = 15% for current Crafts; no Artisan override currently.
- Payout not immediately eligible after sale.
- Return / Refund required in MVP.
- Payment Layer independent from Checkout.
- Shipping Layer independent from Order System.
- Notification Layer independent.
- One Payment Gateway + one Courier initially, extensible later.
- Egypt Launch Market = EGP.
- Egypt shipping fee = 150 EGP.
- Egypt free-shipping threshold = 2000 EGP.
- Order Status != Payment Status.
- Artisan preparation transitions are limited and server-controlled.
- Order status aggregation is server-controlled.
- One Shipment per Artisan Group in MVP.
- Manual Admin shipping transitions are valid before Courier API integration.
- Tracking URL, when present, must use HTTPS.
- Guest Tracking must use a secure opaque token; Order Number alone is not authorization.

---

# 13. Decisions Still Needed Later

- First Payment Gateway.
- First Courier.
- Final Return Window.
- Return Shipping Responsibility.
- Final Payout Cycle.
- Detailed Refund workflow.
- Notification delivery details / templates.

The following are no longer unresolved:

- Egypt shipping fee / threshold.
- Orders schema foundation.
- Artisan / Admin Order read boundaries.
- Artisan fulfillment transitions.
- Admin manual Shipment lifecycle.
- Tracking metadata validation / audit direction.
- Guest Tracking security direction.

---

# 14. Current Implementation Sequence

```text
S12 Product Foundations                              ✅
S13 Product Approval                                 ✅
S14 Public Marketplace DB Integration                ✅
S15.0 Migration Reconciliation                       ✅
S15.1 Market & Pricing                               ✅
S15.2 Market Selection                               ✅
S15.3 Secure Cart / Quote                            ✅
S15.4 Promotions + Coupons                           ✅
S15.5.1 Trusted Checkout Summary                     ✅
S15.5.2 Customer Details / Guest Checkout            ✅
S15.5.3 Shipping / Final Total                       ✅
S15.5.4 Transactional Order Creation                 ✅
Artisan Order Read                                   ✅
Artisan Fulfillment                                  ✅
Admin Order Read                                     ✅
Admin Order + Shipping Status                        ✅
Tracking Metadata                                    🟨 final Production Build pending
Customer Tracking View                              NEXT
Secure Guest Tracking Link                           NEXT / same Tracking group
Notifications                                        LATER
Payment Gateway                                      SEPARATE LAYER
```

---

# 15. CURRENT STATUS

```text
LAST FULLY CLOSED TASK:
Admin Order + Shipping Status Foundation ✅

CURRENT TASK:
Tracking Metadata Foundation 🟨

CURRENT STATE:
Implementation + Browser E2E + Live DB verification + Security verification PASSED
Final Production Build result after latest Tracking commit NOT YET RECORDED

NEXT AFTER CLOSURE:
Customer Tracking View + Secure Guest Tracking Link
```

---

# 16. Definition of Closed

A task is CLOSED only when:

1. Business Rule is understood.
2. Required decisions are approved.
3. Implementation exists.
4. Security implications are reviewed.
5. Expected flow is tested.
6. Relevant edge cases are reviewed.
7. No known blocker remains.
8. Required build / integration verification is completed where applicable.
9. Project status documentation is updated.

A page existing in the repository does not mean the feature is closed.

---

# 17. Change Log — 31 August 2026

## Order Creation

- Closed S15.5.4 Transactional Order Creation.
- Verified real browser Order creation and live DB snapshots.
- Verified atomic stock decrement and idempotency.

## Artisan Orders

- Replaced Artisan Orders prototype with real DB-backed view.
- Closed Artisan Order Read Foundation.
- Added secure Artisan fulfillment transitions and audit history.
- Closed Secure Artisan Fulfillment Actions.

## Admin Orders / Shipping

- Replaced Admin Orders `localStorage` prototype with real DB-backed Super Admin view.
- Closed Admin Order Read Foundation.
- Added Admin Order confirmation.
- Added server-controlled Order aggregation.
- Added one Shipment per Artisan Group.
- Added manual Shipment lifecycle and Shipment history.
- Browser E2E reached delivered successfully while Payment remained pending.
- Closed Admin Order + Shipping Status Foundation.

## Tracking Metadata

- Added `shipment_tracking_history`.
- Added Super Admin secure tracking RPC.
- Added Courier code / Tracking number / HTTPS Tracking URL form.
- Verified non-admin rejection and HTTP URL rejection.
- Verified identical saves are idempotent.
- Browser saved `test_courier / TEST-12345 / https://example.com/track/TEST-12345`.
- Live DB confirmed exactly one Tracking history row after two identical saves.
- Final Production Build after the latest Tracking UI commit remains the only current closure gate.

# IRTH Project Status

**Project:** IRTH  
**Document Purpose:** Current implementation status of the IRTH MVP  
**Last Updated:** 31 August 2026  
**Current Position:** Customer / Guest Order Tracking

---

# 1. Source of Truth

Priority remains:

1. **IRTH MVP Specification v0.1** — source of truth for approved Product / Architecture decisions.
2. **IRTH_PROJECT_STATUS.md** — source of truth for actual implementation / test status.
3. **Git repository** — source of truth for application code and migration files.
4. **Live Supabase** — source of truth for currently running database state.

If this document conflicts with the Specification on a Product decision, the Specification wins unless the owner explicitly approves a change.

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
Orders                      🟨 Real core implemented; customer tracking/returns/payment integration remain
Shipping                    🟨 Manual Shipment lifecycle + Tracking metadata real; Courier API later
Tracking                    🟨 Admin Tracking CLOSED; Customer / Guest Tracking NEXT
Money                       🟨 Pricing + Promotions + Coupons + Commission snapshot real; Payment/Payout later
Testing & Final Polish      ⬜ Later
```

Current major position:

```text
Marketplace / Discovery         ✅
Secure Shopping                 ✅ core
Transactional Orders            ✅ core
Artisan Fulfillment             ✅ core
Admin Order Management          ✅ core
Shipping Status                 ✅ manual MVP foundation
Tracking Metadata               ✅ CLOSED
Customer Tracking View          ← NEXT
Secure Guest Tracking Link      ← NEXT / same Tracking group
Notifications                   LATER
Payments                        SEPARATE LAYER
```

---

# 4. Closed Milestones

## S12 — Product Foundations — CLOSED ✅

### S12.1 Inventory Foundation

- Finite stock foundation.
- Made-to-Order / one-of-a-kind modes.
- Secure inventory update boundary.

### S12.2 Media Foundation

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

Browser stores intent only. Server is authoritative for Product availability, Market Price, inventory and trusted totals.

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

Threshold basis is trusted merchandise subtotal after Promotions + Coupon.

Shipping is charged once per unified Order.

Missing Market shipping config fails closed.

---

## S15.5.4 — Transactional Order Creation — CLOSED ✅

Real transactional Order foundation:

```text
orders
order_customer_details
order_artisan_groups
order_items
shipments
order_status_history
```

Verified behavior:

- One Customer Order.
- Internal Artisan split.
- Historical Product / Money snapshots.
- Atomic stock revalidation + decrement.
- Idempotent Order creation.
- Coupon Redemption inside secure transaction.
- Commission-rate snapshot at sale.
- Guest Customer supported.
- Payment Status separate from Order Status.

Closure record:

```text
docs/IRTH_S15_5_4_CLOSURE.md
```

---

## Artisan Order Read Foundation — CLOSED ✅

`/artisan/orders` reads real Orders from Supabase.

Artisan does NOT receive Customer email, phone, WhatsApp, Full Address or Direct Contact Information.

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

Transitions are server-validated and audited in:

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

Database authorization rejects non-Super-Admin users.

Closure record:

```text
docs/IRTH_ADMIN_ORDER_READ_CLOSURE.md
```

---

## Admin Order + Shipping Status Foundation — CLOSED ✅

Implemented lifecycle:

```text
Order:
received
↓
confirmed
↓
server aggregation from Artisan Groups / Shipments

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

## Tracking Metadata Foundation — CLOSED ✅

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
- Private privileged implementation with explicit Super Admin authorization.

Live browser / DB verification used Order:

```text
IRTH-20260830-782EBA88
```

Verified test state:

```text
Order status:      delivered
Payment status:    pending
Shipment status:   delivered
Courier code:      test_courier
Tracking number:   TEST-12345
Tracking URL:      https://example.com/track/TEST-12345
Tracking history:  1 row
```

Second identical save returned:

```text
بيانات التتبع لم تتغير.
```

Live DB confirmed exactly one Tracking-history row.

Final Production Build after the Tracking changes passed:

```text
Next.js 16.3.1
Compiled successfully
TypeScript passed
Static pages generated: 51/51
```

The values `test_courier / TEST-12345 / example.com` are test metadata only and are NOT an approved production Courier configuration.

Verification / closure record:

```text
docs/IRTH_TRACKING_METADATA_VERIFICATION.md
```

---

# 5. Current Order / Shipping Architecture

```text
ONE Customer Order
        ↓
Artisan Groups
        ↓
Shipments
```

Rules:

- Order status is not a free Admin dropdown.
- Order aggregation is server-controlled.
- Artisan controls preparation transitions only.
- IRTH / Courier-side logic controls Shipment transitions.
- Payment Status remains independent from Order Status.
- Tracking metadata belongs to the Shipment layer.

---

# 6. NEXT — Customer Tracking View + Secure Guest Tracking Link

**Status: READY TO START 🟢 MVP**

Approved direction:

### Authenticated Customer

Customer may read only their own Orders / Tracking data.

### Guest Customer

Order Number alone is NOT authorization.

Approved security direction:

```text
Opaque high-entropy Guest Access Token
↓
raw token delivered to customer
↓
only token hash stored server-side
↓
secure Order / Tracking lookup
```

The current Orders foundation already has `guest_access_token_hash`, but a usable raw Guest Tracking token/link flow is not implemented yet.

The next implementation must preserve:

- no customer-to-artisan direct contact exposure;
- no customer PII leakage through tracking URLs/pages;
- authenticated ownership checks;
- secure Guest token verification;
- Order / Shipment Timeline from real audited statuses;
- optional Courier tracking number/link when present.

---

# 7. Money Status

## Commission

Real foundation exists ✅

```text
Launch default: 15% for all current Crafts
Artisan overrides: 0 currently
```

Each Order Item stores the applied commission rate historically.

Exact commission amount accounting / payout ledger is not implemented yet.

## Payment

**Status: NOT IMPLEMENTED ⬜**

Payment Layer remains separate from Checkout / Order.

Current test Order correctly remains:

```text
payment_status = pending
```

First Payment Gateway is not approved yet.

## Payout

**Status: NOT IMPLEMENTED ⬜**

Approved sequence:

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

# 8. Returns / Refunds

**Status: REQUIRED BY MVP / DETAILED WORKFLOW LATER 🟨**

Still unresolved:

- Final Return Window.
- Return Shipping Responsibility.
- Detailed Refund engine.

---

# 9. Security / Privacy Snapshot

Customer privacy remains a core Business Rule.

Artisan must never receive:

- Phone.
- Email.
- WhatsApp.
- Full Address.
- Direct Customer contact data.

Important security pattern used in privileged Order/Shipping functions:

```text
Browser / Next.js authenticated context
↓
public SECURITY INVOKER RPC
↓
private SECURITY DEFINER helper only where privileged DB access is genuinely required
↓
explicit authorization inside private function
```

No Supabase Secret / service key is exposed to the Browser.

Known unrelated existing security notes:

1. Legacy `public.review_product_market_price_request(...)` exposure pattern needs a later dedicated hardening pass.
2. Supabase Leaked Password Protection is disabled.
3. Audit history tables intentionally have RLS enabled with no direct Browser policies; this can produce informational `rls_enabled_no_policy` Advisor notices.

---

# 10. Known Technical Debt / Gaps

- Admin Login page authenticates but broader Admin route authorization cleanup remains technical debt; sensitive Order/Shipping DB operations themselves enforce Super Admin authorization.
- Customer `/account/orders` still needs reconciliation with the real Orders / Tracking foundation.
- Secure Guest Tracking link / usable raw Guest token is not implemented yet.
- First Courier is not approved.
- First Payment Gateway is not approved.
- Notification Layer remains prototype / later.
- Reviews still need verified-purchase integration on delivered Orders.
- Payout execution is not implemented.
- Full bilingual QA remains incomplete.
- Search v0.1 is partial.
- Legacy `products.price` must never be trusted for Market-aware commerce.
- One transient `/api/markets` 500 was observed once during local development and then returned 200 on retry; non-blocking unless reproduced.

---

# 11. Approved Decisions — Do Not Reopen Without Reason

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
- Order aggregation is server-controlled.
- One Shipment per Artisan Group in MVP.
- Manual Admin Shipment transitions are valid before Courier API integration.
- Tracking URL, when present, must use HTTPS.
- Guest Tracking must use a secure opaque token; Order Number alone is not authorization.

---

# 12. Decisions Still Needed Later

- First Payment Gateway.
- First Courier.
- Final Return Window.
- Return Shipping Responsibility.
- Final Payout Cycle.
- Detailed Refund workflow.
- Notification delivery details / templates.

No longer unresolved:

- Egypt shipping fee / threshold.
- Orders schema foundation.
- Artisan / Admin Order read boundaries.
- Artisan fulfillment transitions.
- Admin manual Shipment lifecycle.
- Tracking metadata validation / audit direction.
- Guest Tracking security direction.

---

# 13. Current Implementation Sequence

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
Tracking Metadata                                    ✅
Customer Tracking View                               ← NEXT
Secure Guest Tracking Link                           ← NEXT / same Tracking group
Notifications                                        LATER
Payment Gateway                                      SEPARATE LAYER
```

---

# 14. CURRENT STATUS

```text
LAST CLOSED TASK:
Tracking Metadata Foundation ✅

CURRENT TASK:
Customer Tracking View + Secure Guest Tracking Link

CURRENT MAJOR POSITION:
Orders / Tracking

NEXT IMPLEMENTATION GOAL:
Secure customer-facing Order Timeline and Tracking access for authenticated customers and guests.
```

---

# 15. Definition of Closed

A task is CLOSED only when:

1. Business rule is understood.
2. Required decisions are approved.
3. Implementation exists.
4. Security implications are reviewed.
5. Expected flow is tested.
6. Relevant edge cases are reviewed.
7. No known blocker remains.
8. Production Build passes when application code changed.
9. Project status documentation is updated.

---

# 16. Change Log — 31 August 2026

- Closed S15.5.3 Shipping / Final Total Boundary.
- Closed S15.5.4 Transactional Order Creation.
- Closed Artisan Order Read Foundation.
- Closed Secure Artisan Fulfillment Actions.
- Closed Admin Order Read Foundation.
- Closed Admin Order + Shipping Status Foundation.
- Added real Shipment lifecycle and audit history.
- Added Super Admin Order confirmation and server-controlled aggregation.
- Added Tracking Metadata Foundation with HTTPS validation and audit history.
- Verified Tracking browser save and identical-save idempotency.
- Verified Live DB has exactly one Tracking-history row for the browser test.
- Final Tracking Production Build passed with TypeScript and 51/51 static pages.
- Closed Tracking Metadata Foundation.
- Advanced current task to Customer Tracking View + Secure Guest Tracking Link.

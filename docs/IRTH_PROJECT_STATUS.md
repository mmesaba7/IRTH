# IRTH Project Status

**Project:** IRTH  
**Document Purpose:** Current implementation status of the IRTH MVP  
**Last Updated:** 31 August 2026  
**Current Position:** Notifications

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
Orders                      🟨 Core + Tracking implemented; Notifications/Returns/Payment remain
Shipping                    🟨 Manual Shipment lifecycle + Tracking real; Courier API later
Tracking                    ✅ Customer + Guest + Admin Tracking CLOSED
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
Customer Tracking View          ✅ CLOSED
Secure Guest Tracking Link      ✅ CLOSED
Notifications                   ← NEXT
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

Verified behavior includes:

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

Transitions are server-validated and audited in `order_artisan_group_status_history`.

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

Implemented Shipment lifecycle:

```text
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
- Conservative server-controlled Order aggregation.
- One Shipment per Artisan Group in MVP.
- Automatic Shipment creation when group becomes ready.
- Manual Super Admin Shipment status actions.
- `shipment_status_history` audit trail.
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

Live browser / DB verification Order:

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

The `test_courier / TEST-12345 / example.com` values are test metadata only and are NOT an approved production Courier configuration.

Closure record:

```text
docs/IRTH_TRACKING_METADATA_VERIFICATION.md
```

---

## Customer Tracking View + Secure Guest Tracking Link — CLOSED ✅

Migration:

```text
supabase/migrations/20260831105348_create_secure_customer_guest_tracking_read_boundary.sql
```

Implemented:

- `/account/orders` now reads real Customer Orders from Supabase rather than the previous localStorage prototype.
- Authenticated customer access is ownership-scoped.
- Direct authenticated SELECT on core Order/Tracking tables is revoked.
- Customer payload exposes only customer-visible Order, item, timeline and Shipment fields.
- Multi-Shipment tracking is supported.
- Guest Tracking requires Order Number + opaque Guest credential.
- Order Number alone is not authorization.
- Guest RPC is `service_role`-only; `anon` and `authenticated` cannot execute it directly.
- Guest token is created server-side with HMAC-SHA256 using private `IRTH_GUEST_TRACKING_SECRET` and the Order idempotency context.
- PostgreSQL stores only SHA-256 of the raw Guest token.
- Raw Guest token is not stored in localStorage, sessionStorage, PostgreSQL or project documentation.
- Guest credential travels initially in a URL fragment, not a query parameter.
- Success/Tracking pages capture the fragment then remove it from the visible URL/history using `history.replaceState`.
- Guest API responses use no-store/no-referrer security headers.
- Guest tracking page is `noindex, nofollow`.

Authenticated browser E2E verified the existing delivered Order:

```text
IRTH-20260830-782EBA88
```

Negative Guest browser E2E verified:

```text
Order Number only         → no Order data
Order Number + bad token  → no Order data
Both cases                → same generic unavailable behavior
```

Valid Guest browser E2E created the retained Live test Order:

```text
IRTH-20260831-7987F614
```

Owner approved retaining this Order permanently as a Live test Order and allowing stock to decrement naturally.

Live DB verification:

```text
customer_user_id:          null
guest token hash:          present (64 hex chars)
status:                    received
payment status:            pending
subtotal before promotion: 350 EGP
promotion discount:         35 EGP
coupon discount:             0 EGP
merchandise subtotal:      315 EGP
shipping fee:              150 EGP
final total:               465 EGP
commission snapshot:        15%
clay-vessel stock:           4 → 3
```

Full closure record:

```text
docs/IRTH_CUSTOMER_GUEST_TRACKING_CLOSURE.md
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
- Customer tracking reads use a narrow customer-safe payload boundary.
- Guest tracking uses a server-verified opaque credential.

---

# 6. NEXT — Notifications

**Status: READY TO REVIEW / START 🟢 MVP**

Specification sequence after Tracking:

```text
Tracking
↓
Notifications
```

Notification Layer remains independent from Order/Shipping/Payment systems.

Before implementation, Notification v0.1 decisions and the current `/notifications` prototype must be reviewed against the Specification.

Do not start Payment Gateway or Courier API as part of Notifications.

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

No Supabase Secret / service key is exposed to the Browser.

Current Order/customer read security model:

```text
Authenticated Customer
↓
public SECURITY INVOKER customer RPC
↓
private SECURITY DEFINER ownership-scoped implementation
↓
customer-safe payload
```

Guest model:

```text
Guest Browser credential
↓
IRTH server POST endpoint
↓
service_role-only Guest RPC
↓
SHA-256 hash verification
↓
customer-safe payload
```

Known unrelated existing security notes:

1. Legacy `public.review_product_market_price_request(...)` exposure pattern needs a later dedicated hardening pass.
2. Supabase Leaked Password Protection is disabled.
3. Audit history tables intentionally have RLS enabled with no direct Browser policies; this produces informational `rls_enabled_no_policy` Advisor notices.

Final Security Advisor after Customer/Guest Tracking showed no new Tracking-specific vulnerability.

---

# 10. Known Technical Debt / Gaps

- Admin Login / broader Admin route authorization cleanup remains technical debt; sensitive Order/Shipping DB operations enforce Super Admin authorization.
- First Courier is not approved.
- First Payment Gateway is not approved.
- Notification Layer is the current next task.
- Reviews still need verified-purchase integration on delivered Orders.
- Payout execution is not implemented.
- Full bilingual QA remains incomplete.
- Search v0.1 is partial.
- Legacy `products.price` must never be trusted for Market-aware commerce.
- One transient `/api/markets` 500 was observed once and then returned 200 on retry; non-blocking unless reproduced.

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
- Guest raw tracking token is not persisted; only its hash is stored.

---

# 12. Decisions Still Needed Later

- First Payment Gateway.
- First Courier.
- Final Return Window.
- Return Shipping Responsibility.
- Final Payout Cycle.
- Detailed Refund workflow.
- Notification delivery details / templates, subject to the Specification review for the next task.

No longer unresolved:

- Egypt shipping fee / threshold.
- Orders schema foundation.
- Artisan / Admin Order read boundaries.
- Artisan fulfillment transitions.
- Admin manual Shipment lifecycle.
- Tracking metadata validation / audit direction.
- Customer tracking read boundary.
- Guest Tracking security direction and implementation.

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
Customer Tracking View                               ✅
Secure Guest Tracking Link                           ✅
Notifications                                        ← NEXT
Payment Gateway                                      SEPARATE LAYER
```

---

# 14. CURRENT STATUS

```text
LAST CLOSED TASK:
Customer Tracking View + Secure Guest Tracking Link ✅

CURRENT TASK:
Notifications — review/spec alignment before implementation

CURRENT MAJOR POSITION:
Orders / Notifications

NEXT IMPLEMENTATION GOAL:
Review Notification v0.1 requirements and current prototype, batch any unresolved decisions, then implement the independent Notification Layer without coupling it to Payment or Courier providers.
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
10. Local / GitHub / Live Supabase state is reconciled where relevant.

---

# 16. Change Log — 31 August 2026

- Closed S15.5.3 Shipping / Final Total Boundary.
- Closed S15.5.4 Transactional Order Creation.
- Closed Artisan Order Read Foundation.
- Closed Secure Artisan Fulfillment Actions.
- Closed Admin Order Read Foundation.
- Closed Admin Order + Shipping Status Foundation.
- Closed Tracking Metadata Foundation.
- Added secure customer-safe Order read boundary.
- Replaced Customer `/account/orders` localStorage prototype with real Supabase Orders.
- Added Customer Order Timeline and Multi-Shipment Tracking.
- Added secure Guest Tracking server boundary.
- Added HMAC-based idempotency-safe Guest credential generation.
- Verified Order Number-only and invalid-token Guest attempts expose no Order data.
- Verified valid Guest Tracking end to end with retained Live Order `IRTH-20260831-7987F614`.
- Retained the Guest test Order by owner decision; `clay-vessel` finite stock decreased from 4 to 3.
- Added final hardening to remove captured Guest credentials from visible URL/history after page load.
- Added `docs/IRTH_CUSTOMER_GUEST_TRACKING_CLOSURE.md`.
- Closed Customer Tracking View + Secure Guest Tracking Link.
- Advanced current task to Notifications.

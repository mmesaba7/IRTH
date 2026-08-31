# IRTH Project Status

**Project:** IRTH  
**Document Purpose:** Current implementation status of the IRTH MVP  
**Last Updated:** 31 August 2026  
**Current Position:** Phase 6 — Money review after Notification Foundation closure

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

Future product direction already approved:

- Android application after the web Marketplace reaches the appropriate stage.
- iOS application after the web Marketplace reaches the appropriate stage.
- Current web/backend architecture should remain reusable by future mobile clients rather than being rebuilt from zero.

This is an **Architecture Later** direction, not an instruction to build mobile apps during the current MVP task.

---

# 3. Overall MVP Progress

```text
Foundation                  ✅ Core implemented
Identity & Structure        🟨 Mostly implemented
Marketplace                 ✅ Core implemented
Shopping                    ✅ Trusted Checkout + real Order creation foundation
Orders                      ✅ Core + Fulfillment + Shipping + Tracking + Notifications foundation
Shipping                    🟨 Manual Shipment lifecycle + Tracking real; Courier API later
Tracking                    ✅ Customer + Guest + Admin Tracking CLOSED
Notifications               ✅ Notification Foundation v0.1 CLOSED
Money                       🟨 Pricing + Promotions + Coupons + Commission-rate snapshot real; remaining Money work next
Returns / Refunds           🟨 Required by MVP; detailed workflow still unresolved
Reviews                     🟨 Existing UI/foundation; verified-purchase integration still required
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
Customer / Guest Tracking       ✅ CLOSED
Notification Foundation         ✅ CLOSED
Money                           ← NEXT REVIEW
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

- `/account/orders` reads real Customer Orders from Supabase.
- Authenticated customer access is ownership-scoped.
- Direct authenticated SELECT on core Order/Tracking tables is revoked.
- Customer payload exposes only customer-visible Order, item, timeline and Shipment fields.
- Multi-Shipment tracking is supported.
- Guest Tracking requires Order Number + opaque Guest credential.
- Order Number alone is not authorization.
- Guest RPC is `service_role`-only.
- Raw Guest token is not persisted; PostgreSQL stores only its hash.
- Guest credential is initially transported in a URL fragment and removed from visible URL/history after capture.
- Guest API responses use no-store/no-referrer security headers.

Full closure record:

```text
docs/IRTH_CUSTOMER_GUEST_TRACKING_CLOSURE.md
```

---

## Notification Foundation v0.1 — CLOSED ✅

Specification requirement satisfied for the current real domain events:

```text
Domain Event
    ↓
Notification Layer
    ├── In-App
    └── Email Outbox
            ↓
       Worker
            ↓
       Provider Adapter
            ↓
          Resend
```

### N1 — Notification Database + Security — CLOSED ✅

Migration:

```text
supabase/migrations/20260831114954_create_notification_foundation.sql
```

- Real `public.notifications` store.
- Private Email Outbox.
- Secure ownership-scoped read/mark RPCs.
- Direct Browser table access denied.
- Deduplication verified.

### N2 — Order / Shipping / Moderation Wiring — CLOSED ✅

Migrations:

```text
supabase/migrations/20260831115532_wire_order_shipping_notifications.sql
supabase/migrations/20260831120010_wire_product_moderation_notifications.sql
```

- Existing audited domain history emits notification events.
- Registered Customer, Guest Customer, Artisan and Super Admin fan-out verified.
- Future Payment / Return / Payout events will use the same Notification Layer when their owning modules exist.

### N3 — Real Notification Center — CLOSED ✅

- Removed notification localStorage prototype.
- `/notifications` is DB-backed.
- Header unread badge is real.
- Mark one / mark all read verified.

### N4 — Resend Email Transport — CLOSED ✅

Migration:

```text
supabase/migrations/20260831121510_add_notification_email_outbox_worker_boundary.sql
```

Implemented:

- Provider adapter boundary.
- Resend first MVP email provider.
- Secure internal processor route.
- Retry/backoff and stale-lock recovery.
- Provider idempotency.
- Arabic / English templates.
- Egypt MVP `auto` email locale resolves to Arabic.
- Guest Tracking token generated only at render/send time; raw token is not stored in outbox or DB.
- Email failure remains independent from Order Status.

Controlled transport E2E:

```text
claimed = 1
sent    = 1
failed  = 0
```

Live DB verification confirmed:

```text
status              = sent
provider            = resend
provider_message_id = present
sent_at              = present
last_error           = null
```

The controlled email test row was removed after verification.

Production customer email delivery still requires an IRTH-controlled verified sender domain and production environment configuration. This is deployment configuration, not unfinished Notification architecture.

Full closure record:

```text
docs/IRTH_NOTIFICATION_FOUNDATION_CLOSURE.md
```

---

# 5. Current Order / Shipping / Notification Architecture

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
- Notification Layer consumes domain events and does not own Order/Shipping/Payment business rules.
- Email provider failure does not mutate Order Status.

---

# 6. NEXT — Phase 6 Money Review

The Specification roadmap places **Money** after Orders.

Money scope includes:

- Commission.
- Discounts.
- Coupons.
- Payout calculation.
- Taxes / withholdings.
- Refund basics.

Important current reality:

- Commission configuration/rate snapshot foundation already exists.
- Promotions and Coupons already have real foundations.
- These existing modules must be reused, not rebuilt.
- Exact commission amount accounting / ledger is not yet implemented.
- Payout calculation / eligibility ledger is not implemented.
- Taxes / withholdings rules are not approved yet.
- Refund basics depend on unresolved Return / Refund decisions.
- Payment Gateway is a separate Payment Layer and the first provider is not yet approved.

Therefore the next task is **review + gap mapping + required decision package for remaining Money work**, before writing financial DDL or code.

---

# 7. Money Status

## Commission

Real foundation exists ✅

```text
Launch default: 15% for all current Crafts
Artisan overrides: 0 currently
```

Each Order Item stores the applied commission rate historically.

Still not implemented:

- Exact commission amount accounting ledger.
- Final accounting treatment of IRTH-funded vs Artisan-funded discounts where money settlement is affected.

## Discounts / Coupons

Real commerce calculation foundations exist ✅

Do not rebuild S15.4.

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

Final payout cycle is not approved yet.

## Taxes / Withholdings

**Status: DECISION NOT APPROVED ⬜**

No tax type, rate or withholding rule should be invented before legal/accounting decisions are approved.

---

# 8. Returns / Refunds

**Status: REQUIRED BY MVP / DETAILED WORKFLOW LATER 🟨**

Approved simple direction:

```text
Customer requests return
↓
IRTH reviews
↓
Accept / Reject
↓
If accepted: coordinate return
↓
Receive / inspect
↓
Refund handling
```

Still unresolved:

- Final Return Window.
- Return Shipping Responsibility.
- Detailed Refund engine.
- Exceptions for Custom / Made-to-Order products.

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

Notification security model:

```text
Authenticated User
↓
secure ownership-scoped RPC
↓
user's notification feed only
```

Email worker model:

```text
Private processor secret
↓
server route
↓
service-role DB worker RPC
↓
provider adapter
```

Final Security Advisor after Notification closure showed no new Notification-specific WARN vulnerability.

Expected informational notices:

- `public.notifications` RLS enabled with no direct policies because Browser table access is intentionally denied and secure RPCs are used.
- Audit history tables use the same intentional deny-direct-access pattern.

Known pre-existing security notes:

1. Legacy `public.review_product_market_price_request(...)` remains an authenticated-executable SECURITY DEFINER warning and needs a later dedicated hardening pass.
2. Supabase Leaked Password Protection remains disabled.

---

# 10. Known Technical Debt / Gaps

- Admin Login / broader Admin route authorization cleanup remains technical debt; sensitive Order/Shipping DB operations enforce Super Admin authorization.
- First Courier is not approved.
- First Payment Gateway is not approved.
- Production email sender domain is not approved / verified yet.
- Reviews still need verified-purchase integration on delivered Orders.
- Return / Refund workflow still needs final decisions and implementation.
- Payout calculation / execution is not implemented.
- Tax / withholding rules are not approved.
- Full bilingual QA remains incomplete.
- Search v0.1 is partial.
- Legacy `products.price` must never be trusted for Market-aware commerce.
- One transient `/api/markets` 500 was previously observed once and then returned 200 on retry; non-blocking unless reproduced.

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
- Artisan cannot directly contact Customer.
- Product Approval in MVP.
- Artisan Promotions require IRTH approval.
- Reviews require verified delivered purchase.
- Artisan Review replies require IRTH moderation.
- One Super Admin in MVP.
- Commission by Craft with optional Artisan override.
- Launch commission = 15% for current Crafts; no Artisan override currently.
- Payout not immediately eligible after sale.
- Return / Refund required in MVP.
- Payment Layer independent from Checkout.
- Shipping Layer independent from Order System.
- Notification Layer independent.
- Resend is the first MVP Email provider behind a provider-independent adapter.
- Egypt MVP automatic notification email language resolves to Arabic.
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
- Android + iOS are approved future product directions after the web Marketplace reaches the appropriate stage; they are not current MVP implementation tasks.

---

# 12. Decisions Still Needed

## Before / during remaining Money work

- Exact commission amount accounting base and settlement ledger rules where discounts affect funding.
- Tax / withholding rules, if any.
- Final Payout Cycle.

## Payment Layer

- First Payment Gateway.
- Detailed COD operational/payment-status rules where needed.

## Shipping

- First Courier.

## Returns / Refunds

- Final Return Window.
- Return Shipping Responsibility.
- Detailed Refund workflow.
- Custom / Made-to-Order return exceptions.

## Production Email Configuration

- Production IRTH domain / sender identity.

No longer unresolved:

- Egypt launch market/currency.
- Egypt shipping fee / free-shipping threshold.
- Orders schema foundation.
- Artisan / Admin Order read boundaries.
- Artisan fulfillment transitions.
- Admin manual Shipment lifecycle.
- Tracking metadata validation / audit direction.
- Customer tracking read boundary.
- Guest Tracking security direction and implementation.
- Notification Foundation architecture.
- First MVP email provider.
- Egypt MVP automatic email language.

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
N1 Notification DB + Security                        ✅
N2 Notification Domain Wiring                        ✅
N3 Real Notification Center                          ✅
N4 Resend Email Transport                            ✅
Notification Foundation v0.1                         ✅ CLOSED
Phase 6 Money                                        ← NEXT REVIEW
```

---

# 14. CURRENT STATUS

```text
LAST CLOSED TASK:
Notification Foundation v0.1 ✅

CURRENT TASK:
Phase 6 Money — review existing foundations, identify gaps, batch unresolved decisions

CURRENT MAJOR POSITION:
Money

NEXT IMPLEMENTATION GOAL:
Do not write new financial code yet. First map what is already real (Commission, Promotions, Coupons, Order money snapshots) against the Specification's remaining Money requirements, then present one decision package for the unresolved financial rules.
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
- Closed Customer Tracking View + Secure Guest Tracking Link.
- Implemented Notification Database + Security Foundation.
- Wired current real Order / Shipping / Product moderation events into the independent Notification Layer.
- Replaced notification localStorage prototype with the real DB-backed Notification Center and unread badge.
- Added provider-independent Email Outbox processing boundary.
- Added Resend as first MVP email provider.
- Added protected internal email processor route, idempotency, retry/backoff and stale worker recovery.
- Set current Egypt MVP automatic email locale to Arabic.
- Verified email provider failure path without affecting Order state.
- Verified successful controlled email transport E2E: `claimed=1`, `sent=1`, `failed=0`.
- Verified successful outbox finalization with Resend provider message id and sent timestamp.
- Removed controlled email test row after verification.
- Ran final Supabase Security Advisor; no new Notification-specific WARN vulnerability found.
- Added `docs/IRTH_NOTIFICATION_FOUNDATION_CLOSURE.md`.
- Closed Notification Foundation v0.1.
- Advanced current project position to **Phase 6 — Money review**.

# IRTH Project Status

**Project:** IRTH  
**Document Purpose:** Current implementation status of the IRTH MVP  
**Last Updated:** 31 August 2026  
**Current Position:** Phase 6 — Money / M1.1 Commission Settlement Ledger Foundation

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
Money                       🟨 Pricing + Promotions + Coupons + Commission-rate snapshot real; M1.1 next
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
Money                           ← M1.1 Commission Settlement Ledger Foundation
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

N1 + N2 + N3 + N4 are CLOSED. Production customer email delivery still requires an IRTH-controlled verified sender domain and production environment configuration; this is deployment configuration, not unfinished Notification architecture.

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

# 6. Phase 6 — Money

Money scope includes:

- Commission.
- Discounts.
- Coupons.
- Payout calculation.
- Taxes / withholdings.
- Refund basics.

Existing foundations to reuse:

- Commission configuration/rate snapshot.
- Promotions.
- Coupons.
- Funding attribution.
- Exact money arithmetic + Round Half-Up.
- Historical Order money snapshots.

## Approved Phase 6 Decision Package — 31 August 2026

Owner approved the full Money review recommendation package:

1. **Commission funding treatment:** Artisan-funded discounts reduce the artisan settlement/commission base. IRTH-funded discounts do not reduce the artisan's economic settlement base; IRTH bears that subsidy separately.
2. **Financial ledger:** use append-only financial/settlement ledger entries rather than silently rewriting financial history.
3. **Payment architecture:** keep a dedicated Payment Domain with transaction/event history; `orders.payment_status` remains a summary and is not the sole payment record.
4. **Return granularity:** Returns/Refunds must support Order Item + Quantity rather than forcing full-order return only.
5. **Return hold:** make the return-period hold configurable; do not invent a duration. Missing required configuration must fail closed for automatic Payout eligibility.
6. **Payout cycle:** MVP uses Super Admin-controlled/manual Payout Batches from eligible earnings; automated cycles are Architecture Later.
7. **First Payout Method:** **Bank Transfer**.
8. **Taxes/withholdings:** no automatic tax/withholding rule is invented. The ledger architecture must support explicit adjustment entries, while legal/accounting rules remain unresolved until formally approved.
9. **Payment Gateway:** first gateway selection is deferred until the provider-independent Payment Core exists; only one gateway is implemented in MVP.
10. **Pending online payment stock safety:** when Online Payment exists, failed/expired pending payments must have a trusted cancellation/stock-restoration path. This is an MVP correctness requirement, not feature creep.

Scope classification:

- Core ledger/payment/return/payout correctness: 🟢 MVP.
- Automated payout scheduling / multiple payout methods / multiple gateways: 🟡 Architecture Later capability or 🔵 Post-MVP implementation as applicable.

---

# 7. Money Current State

## Commission

Real foundation exists ✅

```text
Launch default: 15% for all current Crafts
Artisan overrides: 0 currently
```

Each Order Item stores the applied commission rate historically.

Still not implemented before M1.1:

- Exact commission amount accounting.
- Settlement ledger entries.

## Discounts / Coupons

Real commerce calculation foundations exist ✅

Do not rebuild S15.4.

## Payment

**Status: NOT IMPLEMENTED ⬜**

Payment Layer remains separate from Checkout / Order.
First Payment Gateway is intentionally not approved yet.

## Payout

**Status: NOT IMPLEMENTED ⬜**

Approved sequence:

```text
Sale
↓
Payment collected
↓
Delivery
↓
Return period ends
↓
Eligible
↓
Super Admin Payout Batch
↓
Bank Transfer
```

Exact return-window duration remains unresolved.

## Taxes / Withholdings

**Status: BUSINESS / LEGAL RULE NOT APPROVED ⬜**

No tax type, rate or automatic withholding rule may be invented. Ledger support for explicit future adjustments is approved.

---

# 8. Returns / Refunds

**Status: REQUIRED BY MVP / DETAILED WORKFLOW LATER 🟨**

Approved direction:

```text
Customer requests item/quantity return
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
↓
Financial reversal/adjustment
```

Still unresolved:

- Final Return Window duration.
- Return Shipping Responsibility.
- Whether/when original Shipping is refundable.
- Detailed refund execution rules.
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

Financial rules:

- Browser/Client is never the source of truth for payment, commission, refund, payout, discount, tax or settlement values.
- Sensitive Artisan payout account data must not be stored in Browser local/session storage in the real implementation.
- Current `/artisan/payouts`, `/artisan/payouts/setting`, and `/dashboard-admin/commission` pages are legacy/prototype UI and are not financial sources of truth.
- Future real payout-account reads should expose masked data where full values are unnecessary.
- Financial actions must be server/database protected and auditable.

Final Security Advisor after Notification closure and Phase 6 review showed no new Money-specific warning.

Known pre-existing warnings remain:

1. Legacy `public.review_product_market_price_request(...)` authenticated-executable SECURITY DEFINER warning.
2. Supabase Leaked Password Protection disabled.

Expected informational notices include intentional RLS-enabled/no-direct-policy tables used through secure RPC boundaries.

---

# 10. Known Technical Debt / Gaps

- Admin Login / broader Admin route authorization cleanup remains technical debt; sensitive Order/Shipping DB operations enforce Super Admin authorization.
- First Courier is not approved.
- First Payment Gateway is intentionally deferred until Payment Core.
- Production email sender domain is not approved / verified yet.
- Reviews still need verified-purchase integration on delivered Orders.
- Return / Refund workflow still needs final policy details and implementation.
- Payout calculation / execution is not implemented.
- Tax / withholding rules are not approved.
- Full bilingual QA remains incomplete.
- Search v0.1 is partial.
- Legacy `products.price` must never be trusted for Market-aware commerce.
- Legacy Money UI pages still use localStorage/prototype calculations and must not be treated as real financial implementation.

---

# 11. Phase 6 Planned Implementation Sequence

```text
M1 Commission + Settlement Ledger Foundation
    ↓
M2 Payment Core Foundation
    ↓
M3 First Online Payment Provider
    ↓
M4 Returns / Refunds Foundation
    ↓
M5 Payout Eligibility Foundation
    ↓
M6 Payout Accounts + Manual Payout Batches / Bank Transfer
    ↓
M7 Real Money UI + Money Notifications
```

Current task:

```text
M1.1 — Commission Settlement Rules + Ledger Foundation
```

M1.1 must not integrate Payment Gateway, execute Refunds, collect Bank details, or execute Payouts.

---

# 12. Decisions Still Needed Later

## Before production Payout eligibility

- Exact Return Window duration.
- Return Shipping Responsibility.
- Shipping refund policy.
- Custom / Made-to-Order return exceptions.
- Any legally required tax/withholding rules.

## Payment Layer

- First Payment Gateway, after provider-independent Payment Core contract is implemented/reviewed.

## Production operations

- First Courier.
- Verified production email sender domain.

---

# 13. Current Status

```text
LAST CLOSED TASK:
Notification Foundation v0.1 ✅

LAST APPROVED DECISION PACKAGE:
Phase 6 Money Review ✅
- Settlement funding rules approved
- Append-only ledger approved
- Payment domain separation approved
- Item/quantity returns approved
- Configurable fail-closed return hold approved
- Manual Super Admin payout batches approved
- Bank Transfer selected as first payout method
- No invented tax rule approved
- Gateway selection deferred to M3

CURRENT TASK:
M1.1 — Commission Settlement Rules + Ledger Foundation

CURRENT MAJOR POSITION:
Money

NEXT IMPLEMENTATION GOAL:
Build and verify the smallest secure append-only settlement-ledger foundation using existing historical Order Item money/funding/commission-rate snapshots. Do not rebuild Promotions/Coupons and do not integrate Payment/Payout/Refund execution yet.
```

---

# 14. Definition of Closed

A task is not considered closed merely because code exists.

Closure requires, as applicable:

1. Business rule understood.
2. Required Product decisions approved.
3. Implementation exists.
4. Security reviewed.
5. Expected flows tested.
6. Important edge cases reviewed.
7. Git and Live Supabase state reconciled.
8. Production Build passed for relevant application-code changes.
9. Closure documentation updated.

For financial work, historical/audit correctness is part of closure.

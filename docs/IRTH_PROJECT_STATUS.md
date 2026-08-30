# IRTH Project Status

**Project:** IRTH  
**Document Purpose:** Current implementation status of the IRTH MVP  
**Last Updated:** 30 August 2026

---

# 1. Purpose

This document answers:

> **Where are we in the IRTH MVP right now?**

It is NOT the product specification.

Primary references:

1. **IRTH MVP Specification v0.1** — source of truth for approved Product and Architecture decisions.
2. **IRTH_PROJECT_STATUS.md** — source of truth for what has actually been implemented, tested, closed, deferred, or remains incomplete.
3. **Git Repository** — source of truth for application code and migration files.
4. **Live Supabase** — source of truth for the currently running database state.

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

MVP does NOT use Microservices.

Core principle:

> Build simple, but build it correctly.

Architecture remains intentionally extensible for later support of Multiple Payment Gateways, Multiple Couriers, Multi-Country, Multi-Currency, Multiple Roles, Notification Channels, Advanced Search, Analytics, and Integrations without building those systems prematurely.

---

# 3. Overall MVP Progress

```text
Foundation                  ✅ Core implemented
Identity & Structure        🟨 Mostly implemented
Marketplace                 ✅ Core implemented
Shopping                    🟨 Secure commerce foundation in progress
Orders                      🟧 Prototype only
Money                       🟨 Pricing + Promotions + Coupons foundation real; payments later
Testing & Final Polish      ⬜ Later
```

Current major position:

```text
Discovery / Marketplace
        ✅
        ↓
Secure Shopping
        ← CURRENT MAJOR PHASE
        ↓
Orders
        ↓
Shipping
        ↓
Payments
        ↓
Delivery
        ↓
Reviews
        ↓
Payouts
```

---

# 4. Status Legend

| Status | Meaning |
| --- | --- |
| ✅ | Real implementation exists and has been tested |
| 🟨 | Real foundation exists but feature is incomplete |
| 🟧 | UI / prototype exists but does not count as completed business system |
| ⬜ | Not built yet |
| ⚠️ | Technical debt, gap, or issue requiring attention |

---

# 5. Closed Milestones

## S12 — Product Foundations

### S12.1 Inventory Foundation

**Status: CLOSED ✅**

Implemented and tested:

* Product quantity and fixed-stock foundation.
* Made-to-order and one-of-a-kind inventory modes.
* Product ownership rules.
* Product lifecycle integration.
* Secure ownership-checked published-product quantity update RPC.

### S12.2 Media Foundation

**Status: CLOSED ✅**

Implemented and tested:

* Image and Video upload.
* Private Supabase Storage.
* Signed URLs.
* Upload limits and video duration validation.
* Delete, reorder and cover image behavior.
* TUS resumable upload.
* Draft privacy and media ownership protection.
* Final RLS / Security review.

---

## S13 — Product Approval Workflow

**Status: CLOSED ✅**

Real workflow:

```text
Artisan Draft
      ↓
Submit for Review
      ↓
Moderation Request
      ↓
Super Admin Review
   ┌────────────┐
Approve       Reject
   ↓             ↓
Published     Draft + rejection reason
```

Public users cannot see non-published Products.

---

## S14 — Public Marketplace DB Integration

**Status: CLOSED ✅**

Completed:

* Artisan public page integration.
* Craft/Public Products integration.
* Country page integration.
* Homepage + Promotion integration.
* Integration & Security test.

Public visibility chain:

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

Shared public catalog layer:

```text
src/lib/publicMarketplace.ts
```

---

## S15.0 — Database Migration Reconciliation

**Status: CLOSED ✅**

Completed:

* Recovered/reconstructed missing Live migrations into Git.
* Verified fresh local database replay.
* Reconciled Local and Remote migration history.
* Reconstructed required Live table/function/default privilege state.
* Restored safe anonymous Artisan Profile column-level grants.
* Reconciled Promotion RPC privileges.
* Hardened public Product Storage visibility.

---

## S15.1 — Market & Pricing Foundation

**Status: CLOSED ✅**

Implemented:

* `markets`.
* `product_market_prices`.
* Country ≠ Market.
* Independent Market activation.
* One local ISO currency per Market for MVP.
* No automatic FX conversion.
* Product → Market → Price.
* Active/inactive Market-price availability.
* Artisan Market-price proposals through moderation.
* One pending price request per Product + Market.
* Existing approved price remains live while replacement is pending.
* Atomic Super Admin approval/rejection.
* Artisans may prepare prices for inactive Markets.

Important transition rule:

> Legacy `products.price` must NOT be treated as a trusted market-aware commerce price.

---

## S15.2 — Market Selection

**Status: CLOSED ✅**

Implemented:

* Active Market API.
* Market selection API + server helper.
* Header Market Selector.
* Session cookie `irth-market`.
* Active-market validation.
* Geo-based suggestion only; Geo is never authoritative.
* Manual customer confirmation/change.
* ISO country codes.
* No guessing when one Country maps to multiple active Markets.

Approved Launch Market:

```text
Market: Egypt
Currency: EGP
Status: Active
```

---

## S15.3 — Secure Cart / Server Quote

**Status: CLOSED ✅**

Goal achieved:

> Browser state may identify Products and quantity, but client-provided prices and totals are never trusted.

Current secure base flow:

```text
Browser Cart
(slug + quantity intent)
        ↓
POST /api/cart/quote
        ↓
Selected active Market
        ↓
Published Product validation
        ↓
Active Artisan / Country / Craft validation
        ↓
Approved active Market Price
        ↓
Inventory validation
        ↓
Server-authoritative Quote
```

Implemented:

* `src/lib/cartQuote.ts`.
* Secure `/api/cart/quote` route.
* Market-aware Product Page / ProductCard / Cart price integration.
* Duplicate slug quantity aggregation.
* Fixed-stock validation.
* Out-of-stock and insufficient-stock protection.
* Missing/unpublished Product protection.
* Not-priced-for-Market protection.
* Exact Market-price transport via `public.get_product_market_prices_text(...)` returning PostgreSQL `numeric` as text.
* Decimal-string commerce arithmetic.
* New cart entries store Product identity rather than trusted browser price/name/artisan data.

Focused ESLint and Production Build / TypeScript passed.

---

## S15.4.1 — Promotion Market Scope + Money Storage

**Status: CLOSED ✅**

Implemented:

* Promotions are Market-scoped.
* Fixed Promotion money is not globally constrained to 2 decimals at storage level.
* Promotion create/read RPCs are Market-aware.
* Commerce eligibility requires matching active Market price.
* Legacy `products.price` is not trusted for Promotion commerce calculation.

Migration:

```text
supabase/migrations/20260830140249_scope_promotions_to_markets.sql
```

---

## S15.4.2 — Promotion Calculation in Secure Server Quote

**Status: CLOSED ✅**

Implemented:

* `src/lib/promotionQuote.ts` server-only calculation layer.
* Best Promotion Wins by actual monetary value.
* Fixed per-unit Promotion.
* Percentage Promotion line calculation.
* Artisan wins an exact Promotion monetary tie against IRTH.
* Currency-aware minor-unit scale and Round Half-Up.
* Promotion funding split: IRTH vs Artisan.
* `/api/cart/quote` applies Promotion only after the trusted base quote.
* Homepage displays the winning Promotion using Market currency.

---

## S15.4.3 — Coupon DB Foundation

**Status: CLOSED ✅**

Implemented:

```text
coupons
coupon_products
coupon_crafts
coupon_redemptions
```

Key protections:

* Exactly one Market per Coupon.
* Case-insensitive + trim-normalized code uniqueness per Market.
* Percentage/Fixed validation.
* Positive minimum/max/usage constraints.
* `max_discount_amount` only for Percentage Coupons.
* IRTH/Artisan funding integrity.
* Product/Craft restriction tables.
* Redemption ledger without fake `order_id` before Orders.
* RLS on every Coupon table.
* No anonymous direct Coupon table access.
* No authenticated direct Redemption write.
* Super Admin-only Coupon administration.

Migrations:

```text
supabase/migrations/20260830154952_create_coupon_foundation.sql
supabase/migrations/20260830160633_add_coupon_created_by_index.sql
```

Local replay, Remote push, schema verification and Advisor follow-up passed.

---

## S15.4.4 — Coupon Calculation

**Status: CLOSED ✅**

Trusted pipeline now exists:

```text
Market Price
    ↓
Best Product Promotion
    ↓
Stackable Coupon after Promotion
OR
Non-stackable eligible-line comparison
    ↓
Funding Split
    ↓
Trusted Discounted Merchandise Total
```

Implemented:

* Secure Coupon lookup migration `20260830163234_add_secure_coupon_lookup.sql`.
* Private `SECURITY DEFINER` validation/lookup with pinned empty `search_path`.
* Thin public `SECURITY INVOKER` wrapper.
* Narrow Coupon metadata return; no Coupon-code list exposure.
* Market, normalized code, active window, enabled state and total usage-limit validation.
* Server-resolved eligible Product IDs.
* Product/Craft OR/Union restrictions.
* Artisan-funded Coupon scope.
* `src/lib/couponQuote.ts` server-only calculation layer.
* Percentage Coupon calculated once on total eligible subtotal.
* Fixed Coupon cart-level once and capped at eligible subtotal.
* Percentage `max_discount_amount` cap.
* Minimum-order rules on approved stackable/non-stackable bases.
* Exact string/integer money arithmetic.
* Round Half-Up to currency minor unit.
* Proportional Coupon allocation using largest fractional remainder and deterministic `product_id` ties.
* Stackable Coupon after Product Promotion.
* Non-stackable customer-best comparison only over Coupon-eligible lines.
* Exact non-stackable tie keeps Promotion-only.
* Promotions outside Coupon scope remain active (Decision 24A).
* Separate trusted Promotion and Coupon funding attribution.
* Optional `couponCode` accepted by `/api/cart/quote`; client price/discount/subtotal/total remains untrusted.
* Quote does not consume Coupon usage.

Verification completed:

* Full local migration replay/reset passed.
* Production Build / TypeScript passed.
* Remote `db push` passed.
* Private/public function security modes and privileges verified.
* Plain authenticated Coupon-table read blocked by RLS.
* No new S15.4.4-specific Security Advisor warning.
* Normalized code, wrong Market, invalid/expired/exhausted Coupon tests passed.
* Product restriction and Artisan-funded scope tests passed.
* No Redemption consumption verified at DB boundary.
* Local E2E test through real `/api/cart/quote` passed.
* Stackable Percentage + Fixed passed.
* Fixed proportional allocation + deterministic remainder passed.
* Non-stackable Coupon-win / Promotion-win / exact-tie passed.
* Decision 24A passed.
* Minimum, Percentage max cap, Round Half-Up, Product ∪ Craft restriction, Artisan funding attribution passed.

Reusable local-only test support:

```text
supabase/seed.sql
scripts/test-coupon-e2e.mjs
npm.cmd run test:coupon-e2e
```

Final E2E result:

```text
PASS S15.4.4 coupon quote E2E
```

Detailed decision record:

```text
docs/IRTH_S15_4_DECISION_REGISTER.md
```

---

# 6. Current Shopping State

Real foundations now exist for:

```text
Market & Pricing               ✅
Market Selection               ✅
Secure Cart / Server Quote     ✅
Promotion Market Scope         ✅
Promotion Calculation          ✅
Coupon DB Foundation           ✅
Coupon Calculation             ✅
Cart Promotion/Coupon UX       ← NEXT
Secure Checkout                ⬜
Orders                         ⬜
Shipping                       ⬜
Payments                       ⬜
```

Current task:

```text
S15.4.5 — Cart UI
```

---

# 7. Cart Current State

**Status: Trusted commerce backend real; Promotion/Coupon UX next 🟨**

Cart persistence remains browser-based during MVP transition:

```text
localStorage("irth-cart")
```

Browser storage is NOT authoritative for price, eligibility, discounts, or totals.

Server Quote now resolves:

* Current Market and currency.
* Product public availability.
* Approved Market price.
* Inventory and quantity.
* Product Promotion.
* Coupon eligibility.
* Promotion/Coupon discounts.
* Funding attribution.
* Trusted final merchandise subtotal.

The Cart UI has not yet been completed for Coupon entry/state display. That is S15.4.5.

No persistent Cart database table has been approved or created.

---

# 8. Checkout

**Status: Prototype 🟧 — NOT S15.5 IMPLEMENTATION**

Route exists:

```text
/checkout
```

The current page is an old prototype. It still relies on local/browser Order construction and must not be treated as secure Checkout.

Correct action:

> Rebuild the Checkout foundation during **S15.5 — Checkout Foundation** using trusted server-side commerce inputs.

Do not patch the legacy Checkout prototype prematurely.

---

# 9. Orders

**Status: Prototype 🟧**

Existing routes exist, but there is no real PostgreSQL Orders module yet.

Approved architecture remains:

```text
Customer sees ONE order
        ↓
IRTH internally splits by Artisan / Shipment
```

Exact future Order table names are not yet approved.

Before first real Coupon consumption, `coupon_redemptions` must receive a real `order_id -> orders.id` relationship as part of the Order transaction design.

---

# 10. Promotions

**Status: Secure calculation real ✅; admin/artisan workflow already real**

Approved and implemented rules include:

* Promotion ≠ Coupon.
* Every Promotion belongs to a Market.
* Best actual monetary Promotion wins per Product.
* Fixed Promotion is per-unit.
* Percentage Promotion is line-level.
* Exact Artisan-vs-IRTH tie → Artisan wins.
* Customer-facing Promotion discount and funding attribution are separated.

Artisan Promotions still require IRTH approval.

---

# 11. Coupon System

**Status: DB + secure calculation real ✅; Cart UX next**

Approved and implemented rules include:

* One Coupon per Cart/Order MVP.
* Market-scoped code.
* Product/Craft OR/Union restrictions.
* Stackable Coupon applies after Promotions.
* Non-stackable compares only Coupon-eligible portion.
* Coupon never worsens customer price.
* Exact non-stackable tie keeps Promotion-only.
* Fixed Coupon is cart-level once.
* Percentage Coupon calculated once on total eligible subtotal.
* Currency-aware Round Half-Up.
* Proportional allocation with deterministic remainder.
* IRTH-funded or one-Artisan-funded scope.
* Usage is not consumed during Quote.
* Per-customer identity enforcement is deferred to Checkout/Identity.

---

# 12. Public Marketplace / Identity / Security Snapshot

Roles:

```text
customer
artisan
super_admin
```

Implemented:

* Customer signup/login ✅
* Artisan login ✅
* Super Admin login ✅
* Role-based routing ✅
* Protected dashboard routes ✅
* Single Super Admin database rule ✅
* Customer cannot self-assign Artisan or Super Admin ✅

Customer privacy remains a core business rule.

Artisans must NOT receive Customer phone, email, WhatsApp, Full Address, or Direct Contact Information unless a future explicit decision changes this.

---

# 13. Other Major Modules

## Search

**Status: Core real ✅ / Full Search partial 🟨**

Search supports Products, Artisans, Countries, Crafts with intentionally simple ranking. Autocomplete, story/content search and ranking inputs based on future real Orders/Reviews remain later.

## Saved / Wishlist & Recently Viewed

**Status: PARTIAL 🟨**

Browser storage keeps Product identity while display data is re-resolved from the live public Marketplace. Account-level persistence remains later.

## Language / RTL / LTR

```text
RTL / LTR foundation       ✅
Language preference         ✅
Full Arabic UI              🟨
Full English UI             🟨
Translation architecture    ⬜
Final bilingual QA          ⬜
```

## Shipping

**Status: NOT IMPLEMENTED ⬜**

Shipping Layer remains separate from Order System. MVP starts with one Courier; first Courier is not yet approved.

## Payment

**Status: NOT IMPLEMENTED ⬜**

Payment Layer remains separate from Checkout. MVP starts with one Payment Gateway; first Gateway is not yet approved.

Important:

```text
Order Status ≠ Payment Status
```

## Commission

**Status: Prototype 🟧**

Approved model:

```text
Craft Default Commission
        ↓
Optional Artisan Override
        ↓
Historical Applied Snapshot
```

Commission calculation is intentionally not part of S15.4.

## Payout

**Status: Prototype 🟧**

Approved high-level sequence:

```text
Sale
↓
Delivery
↓
Return period expires
↓
Payout becomes eligible
↓
Payout cycle
```

## Returns / Refunds

**Status: NOT IMPLEMENTED ⬜**

Confirmed MVP requirement. Final return period, exclusions and shipping responsibility still need decisions later.

## Reviews

**Status: Prototype 🟧**

Real Reviews must depend on a real delivered Order / verified purchase. Artisan reply remains subject to IRTH moderation.

## Notifications

**Status: Prototype 🟧**

Notification Layer remains independent. MVP channels are In-App + Email.

## Wholesale

**Status: NOT IMPLEMENTED ⬜**

Wholesale Request is MVP scope and must preserve Customer-contact privacy from Artisans.

---

# 14. Security Advisor / Security Notes

Known unrelated existing warnings remain:

1. `public.review_product_market_price_request(...)` is a `SECURITY DEFINER` function executable by `authenticated`; it performs internal Super Admin authorization but should be reviewed in the appropriate Security/Polish pass rather than silently changing closed S15.1 behavior.
2. Leaked Password Protection is disabled in Supabase Auth.
3. Existing performance/index warnings may remain until affected tables have real workload.

S15.4.4 introduced no new Coupon-specific Security Advisor warning.

Coupon lookup boundary intentionally uses:

```text
public SECURITY INVOKER wrapper
        ↓
private SECURITY DEFINER lookup
```

with explicit narrow grants and no raw general Coupon-table client read.

---

# 15. Known Technical Debt / Gaps

* Admin Artisans / Countries / Crafts remain mixed prototype/real areas.
* Checkout remains insecure prototype until S15.5.
* Orders, Notifications, Reviews, Commission UI, Payout UI remain prototype or absent as noted above.
* Sensitive payout/bank settings must eventually move to strict server-side storage.
* Full bilingual UI is incomplete.
* Search v0.1 is incomplete.
* Legacy `products.price` remains temporarily and must never be trusted for commerce.
* Made-to-Order Server Quote branch lacks a suitable current Live production fixture; this is a documented test-fixture gap, not a known branch failure.
* Existing `<img>` optimization warnings are non-blocking legacy UI debt.
* Full repository lint still contains older unrelated debt; focused Shopping lint/build passes.

---

# 16. Product Decisions Already Approved — Do Not Reopen Without Reason

Do NOT automatically reopen:

* IRTH handmade / heritage Marketplace.
* Arabic + English; Arabic RTL + English LTR.
* Mobile-First + Responsive.
* Craft primary Shop entry; Explore can start from Country.
* Comprehensive Search with simple MVP ranking.
* Guest Checkout; optional Customer account.
* Customer sees one Order with internal Artisan/Shipment split.
* Artisan does not receive sensitive Customer contact information and does not directly contact Customer.
* Product Approval in MVP.
* Artisan Promotions require IRTH approval.
* Reviews require delivered verified purchase; Artisan reply moderated.
* One Super Admin in MVP.
* Commission by Craft + optional Artisan override.
* Payout delayed after delivery/return conditions.
* Returns / Refunds in MVP.
* Payment, Shipping and Notification layers separated.
* One Payment Gateway + one Courier initially, extensible later.
* Country and Market separate.
* Product prices Market-specific; no automatic FX conversion.
* Geo only suggests Market; Customer confirms/changes it.
* Egypt Launch Market uses EGP.
* Legacy Product prices are not automatically mapped to Egypt/EGP.
* S15.4 Decisions 1A–24A as recorded in `IRTH_S15_4_DECISION_REGISTER.md`.

---

# 17. Decisions Still Needed Later

These points remain unresolved unless separately approved:

* First Payment Gateway.
* First Courier.
* Final Shipping cost/free-shipping rules.
* Final Return Window.
* Return Shipping Responsibility.
* Final Payout Cycle.
* Exact Orders schema/table naming.
* Persistent Cart DB decision, if ever needed.

S15.4 Promotion/Coupon overlap, Market scope, fixed/percentage calculation, rounding, stacking, allocation and non-stackable behavior are no longer unresolved; they are approved and implemented.

---

# 18. Shopping Implementation Sequence

```text
S15.0  Database Migration Reconciliation ✅
        ↓
S15.1  Market & Pricing Foundation ✅
        ↓
S15.2  Market Selection ✅
        ↓
S15.3  Secure Cart / Server Quote ✅
        ↓
S15.4.1 Promotion Market Scope ✅
        ↓
S15.4.2 Promotion Calculation ✅
        ↓
S15.4.3 Coupon DB Foundation ✅
        ↓
S15.4.4 Coupon Calculation ✅
        ↓
S15.4.5 Cart UI ← NEXT
        ↓
S15.4.6 Security / Edge Integration Closure
        ↓
S15.5  Checkout Foundation
        ↓
Shopping Integration Test
```

---

# 19. CURRENT STATUS

```text
LAST CLOSED TASK:
S15.4.4 — Coupon Calculation ✅

CURRENT MAJOR POSITION:
Secure Shopping

NEXT TASK:
S15.4.5 — Cart UI
```

---

# 20. NEXT TASK — S15.4.5

## S15.4.5 — Cart UI

**Status: READY TO START**

Goal:

Expose the already trusted Promotion/Coupon quote outputs in the Cart UX without duplicating commerce logic on the client.

Expected boundary:

* Coupon code input and apply/remove UX.
* Display Promotion and Coupon discounts from trusted `/api/cart/quote` output.
* Display trusted discounted line totals and merchandise subtotal.
* Represent Coupon states such as invalid/unavailable, minimum not met, Promotion preferred, or applied.
* Keep client responsible only for input/state; trusted money remains server-calculated.

Do NOT move into Checkout, Orders, Payment, Shipping, Commission or Payout during this task.

---

# 21. S15.5 Boundary

The following belongs to **S15.5 — Checkout Foundation**, not S15.4:

* Rebuilding `Complete your order`.
* Trusted Checkout summary.
* Customer shipping/contact input handling.
* Guest Checkout implementation.
* Secure transition from Quote to Order creation.
* Checkout-side server revalidation.
* Removing localStorage Order creation.
* Per-customer Coupon usage enforcement where Customer identity is available.

---

# 22. DO NOT REOPEN

Unless there is a genuine technical/business conflict, do not reopen:

```text
S12 Inventory Foundation
S12 Media Foundation
S13 Product Approval Workflow
S14 Public Marketplace DB Integration
S15.0 Database Migration Reconciliation
S15.1 Market & Pricing Foundation
S15.2 Market Selection
S15.3 Secure Cart / Server Quote
S15.4.1 Promotion Market Scope
S15.4.2 Promotion Calculation
S15.4.3 Coupon DB Foundation
S15.4.4 Coupon Calculation
```

---

# 23. Definition of "Closed"

A task is only CLOSED when:

1. Business rule is understood.
2. Required decision is approved.
3. Implementation exists.
4. Security implications are reviewed.
5. Expected flow is tested.
6. Relevant edge cases are reviewed.
7. No known blocker remains.
8. `IRTH_PROJECT_STATUS.md` is updated.

A page existing in the repository does NOT mean the feature is closed.

---

# 24. Project Working Method

For every task:

```text
Understand
↓
Discuss
↓
Decide
↓
Implement
↓
Test
↓
Close
↓
Update Project Status
```

---

# 25. Change Log

## 30 August 2026 — S15.4.4 Closure

* Closed S15.4.4 — Coupon Calculation.
* Added secure Market-scoped Coupon lookup RPC boundary.
* Added `src/lib/couponQuote.ts` trusted server-only Coupon calculation.
* Added Percentage and Fixed Coupon calculation with exact decimal-string arithmetic.
* Added Round Half-Up and currency minor-unit handling.
* Added minimum-order, percentage max-cap and fixed eligible-subtotal cap behavior.
* Added proportional line allocation with deterministic largest-remainder / `product_id` tie-break.
* Implemented stackable Promotion → Coupon flow.
* Implemented non-stackable customer-best comparison only over Coupon-eligible lines.
* Confirmed exact non-stackable tie keeps Promotion-only.
* Approved and implemented Decision 24A: Promotions outside Coupon scope remain active.
* Added separate trusted Coupon funding attribution.
* Confirmed Quote never consumes Coupon Redemption.
* Verified Remote function security modes, RLS boundary, usage limits, time window, normalization and Artisan scope.
* Added local-only deterministic Coupon E2E fixtures and reusable `npm.cmd run test:coupon-e2e` runner.
* Final real `/api/cart/quote` E2E passed for stackable, fixed, percentage, allocation, non-stackable win/lose/tie, 24A, minimum, max cap, rounding, restriction union and Artisan funding.
* Confirmed S15.4.5 — Cart UI as next task.

## 30 August 2026 — S15.3 Closure

* Closed S15.3 — Secure Cart / Server Quote.
* Removed trust in browser-provided Product prices and totals.
* Added exact Market-price text transport and inventory/public eligibility validation.
* Integrated Market-aware secure quote into Product and Cart surfaces.
* Production Build / TypeScript passed.

## 30 August 2026 — S15.2 Closure

* Closed S15.2 — Market Selection.
* Added active Market API/session selection, Header selector, ISO country codes and non-authoritative Geo suggestion.
* Approved Egypt Launch Market using EGP.

## 30 August 2026 — S15.1 Closure

* Closed S15.1 — Market & Pricing Foundation.
* Created Market-specific pricing and Artisan price moderation workflow.

## 29 August 2026

* Confirmed S12, S13 and S14 closed.
* Completed S15.0 — Database Migration Reconciliation.

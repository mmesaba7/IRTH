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

Architecture should remain extensible for later support of:

* Multiple Payment Gateways
* Multiple Couriers
* Multi-Country
* Multi-Currency
* Multiple Roles
* Notification Channels
* Advanced Search
* Analytics
* Integrations

These advanced systems should not be built before they are needed.

---

# 3. Overall MVP Progress

```text
Foundation                  ✅ Core implemented
Identity & Structure        🟨 Mostly implemented
Marketplace                 ✅ Core implemented
Shopping                    🟨 Real foundation in progress
Orders                      🟧 Prototype only
Money                       🟨 Pricing foundation real; payments later
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

Implemented:

* Product quantity
* Fixed-stock foundation
* Made-to-order foundation
* Product ownership rules
* Product lifecycle integration
* Secure artisan inventory quantity update boundary

A gap discovered during S15.3 was fixed without broadening general Product UPDATE permissions.

Published-product quantity updates now use a dedicated ownership-checked database RPC that updates quantity only.

---

### S12.2 Media Foundation

**Status: CLOSED ✅**

Implemented and tested:

* Image upload
* Video upload
* Private Supabase Storage
* Signed URLs
* Image limits
* Video limits
* Video duration validation
* Delete media
* Reorder images
* Product cover image
* TUS resumable upload
* Draft media privacy
* Media ownership protection
* RLS / Security review

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

Implemented:

* Product moderation requests
* Artisan submission
* Super Admin approval/rejection
* Rejection reason
* Lifecycle enforcement
* Moderation security
* Artisan safe draft updates
* Super Admin review access

Public users cannot see non-published products.

---

## S14 — Public Marketplace DB Integration

**Status: CLOSED ✅**

Completed:

* S14.1 Artisan Public Page Integration ✅
* S14.2 Craft/Public Products Integration ✅
* S14.3 Country Page Integration ✅
* S14.4 Homepage + Promotions Integration ✅
* S14.5 Integration & Security Test ✅

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

This rule is enforced through application logic and database security.

Shared public catalog layer:

```text
src/lib/publicMarketplace.ts
```

---

## S15.0 — Database Migration Reconciliation

**Status: CLOSED ✅**

Completed:

* Recovered missing migration files from Live Supabase migration history.
* Reconstructed missing Inventory, Product Media, Media Reorder, Artisan Product Read, RLS Auto-Enable, and ACL foundations.
* Verified fresh local database replay from repository migrations.
* Reconciled Local and Remote migration history.
* Reconstructed required Live table/function/default privilege state.
* Restored safe anonymous Artisan Profile column-level grants.
* Reconciled Promotion RPC privileges.
* Hardened public Product Storage visibility.

Result:

```text
Git migration history
        =
Reproducible database history
        =
Live migration history
```

---

## S15.1 — Market & Pricing Foundation

**Status: CLOSED ✅**

Implemented:

* `markets`
* `product_market_prices`
* Country ≠ Market
* Market activation independent from Country activation
* One local ISO currency per Market for MVP
* No automatic FX conversion
* Product → Market → Price
* Active/inactive market-price availability
* Legacy `products.price` retained temporarily without guessed market/currency mapping
* Artisan market-price proposals through `moderation_requests`
* One pending price request per Product + Market
* Existing live price remains active while a replacement price is pending
* Atomic Super Admin approval/rejection workflow
* Artisans may prepare prices for inactive Markets without exposing those Markets publicly

Important transition rule:

> Legacy `products.price` must NOT be treated as a trusted market-aware commerce price.

---

## S15.2 — Market Selection

**Status: CLOSED ✅**

Approved and implemented behavior:

```text
System suggests market
        ↓
Customer confirms / changes market
        ↓
Selected market is stored
        ↓
Prices / currency / later shipping adapt
```

Implemented:

* `GET /api/markets`
* Market selection API
* Market selection server helper
* Header Market Selector
* Session cookie `irth-market`
* Active-market validation
* Geo-based market suggestion
* Geo is suggestion only, never authoritative
* Manual customer confirmation/change
* ISO country codes on Countries
* No guessing when one country has multiple active Markets

Launch Market approved and implemented:

```text
Market: Egypt
Currency: EGP
Status: Active
```

Important:

> Egypt being the Launch Market does NOT mean legacy `products.price` values are EGP.

---

## S15.3 — Secure Cart / Server Quote

**Status: CLOSED ✅**

Goal achieved:

> Browser state may identify products and quantity, but client-provided prices and totals are never trusted.

Current secure flow:

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

* `src/lib/cartQuote.ts`
* `src/app/api/cart/quote/route.ts`
* Secure cart quote UI integration
* Product page server-quoted price
* Product cards server-quoted price
* Selected Market currency display
* Duplicate cart slug quantity aggregation
* Fixed-stock inventory validation
* Out-of-stock protection
* Insufficient-stock protection
* Missing/unpublished product protection
* Not-priced-for-market protection
* Checkout enablement only when the full quote is available
* New Add-to-Cart writes slug-only entries instead of browser price/name/artisan data
* Legacy cart entries remain parseable during transition, but their price/name/artisan fields are ignored for commerce calculation

Server quote statuses:

```text
available
product_unavailable
not_priced_for_market
out_of_stock
insufficient_stock
```

### Exact Money Transport

PostgreSQL `numeric` remains the storage type for Market prices.

To avoid JavaScript floating-point conversion before commerce arithmetic, S15.3 added:

```text
public.get_product_market_prices_text(...)
```

The RPC:

* Uses `SECURITY INVOKER`.
* Respects existing RLS.
* Returns approved Market price as PostgreSQL `text`.
* Prevents the Server Quote from relying on JS floating-point representation for price transport.

Commerce arithmetic path:

```text
PostgreSQL numeric
        ↓
price::text
        ↓
Server decimal-string arithmetic
```

Verified example:

```text
Market          Egypt
Currency        EGP
Product         clay-vessel
Inventory       5
Unit Price      "350"
Quantity        2
Line Total      "700"
Subtotal        "700"
canCheckout     true
```

### S15.3 Security / Edge Tests Passed

* Client Price Tampering Protection ✅
* Duplicate Quantity Aggregation ✅
* Missing Product Protection ✅
* Not Priced for Market Protection ✅
* Fixed-stock overflow → `insufficient_stock` ✅
* Invalid quantity API rejection ✅
* Exact stock boundary UI behavior ✅
* Product Page market-aware price ✅
* Product Card market-aware price ✅
* Cart market-aware totals ✅
* Exact Money Transport ✅
* Focused ESLint ✅
* Production Build / TypeScript ✅

### Made-to-Order Test Note

The code contains the Made-to-Order branch and intentionally does not apply fixed inventory quantity checks to Made-to-Order products.

At S15.3 closure, Live Supabase had no suitable **published Made-to-Order product with valid Market pricing** available as a controlled test fixture.

No production Business Data was mutated only to manufacture this test.

This is documented as a test-fixture gap, not a known blocker in the implemented branch.

---

# 6. Current Shopping State

Real foundations now exist for:

```text
Market & Pricing             ✅
Market Selection             ✅
Secure Cart / Server Quote   ✅
```

Still pending:

```text
Promotion Calculation        ⬜
Coupon Foundation            ⬜
Secure Checkout              ⬜
Orders                       ⬜
Shipping                     ⬜
Payments                     ⬜
```

---

# 7. Cart Current State

**Status: Secure Cart Foundation CLOSED ✅**

Cart persistence is still browser-based for the MVP transition:

```text
localStorage("irth-cart")
```

But this browser storage is NOT authoritative for price, availability, or totals.

New cart additions store product identity only.

Server Quote resolves and validates:

* Current Market
* Currency
* Current approved Market Price
* Product public availability
* Fixed-stock inventory
* Quantity
* Trusted line totals
* Trusted subtotal
* `canCheckout`

Promotion, Coupon, and Shipping are intentionally not calculated yet because they belong to later Shopping tasks.

No persistent Cart database table has been approved or created yet.

---

# 8. Product Commerce UI

Product Page and ProductCard no longer use legacy `products.price` for the commercial price shown to the customer.

They call the Server Quote and reflect the selected Market.

For the Egypt Launch Market, the tested Product displays:

```text
350 EGP
```

instead of the old legacy `$85` prototype price.

---

# 9. Checkout

**Status: Prototype 🟧 — NOT S15.5 IMPLEMENTATION**

Route exists:

```text
/checkout
```

Page heading includes:

```text
Complete your order
```

This page is an old prototype and must NOT be treated as secure Checkout.

Current prototype still:

```text
Reads cart from localStorage
        ↓
Uses client-side item fields / prices
        ↓
Collects customer details
        ↓
Creates JavaScript Order object
        ↓
Stores order in localStorage
        ↓
Stores notifications in localStorage
```

After S15.3, new cart entries no longer contain the old price/name/artisan fields, so this prototype can display errors or inconsistent data.

This is expected and is NOT being patched during S15.3.

Correct action:

> Rebuild the Checkout foundation properly during **S15.5 — Checkout Foundation** using trusted server-side commerce inputs.

Do not spend time patching the legacy Complete Your Order prototype before S15.5.

---

# 10. Orders

**Status: Prototype 🟧**

Existing routes include:

```text
/account/orders
/artisan/orders
/dashboard-admin/orders
/order-success
```

But there is currently no real PostgreSQL Orders module.

Approved architecture remains:

```text
Customer sees ONE order
        ↓
IRTH internally splits by artisan / shipment
```

Exact future table names are not yet approved.

---

# 11. Promotions

**Status: Foundation real; secure Shopping calculation pending 🟨**

Approved decision:

> Promotion ≠ Coupon

Promotion foundation currently supports:

* IRTH Promotion
* Artisan Promotion
* Percentage discount
* Fixed discount
* Start/end date
* Funding source
* Pending/Approved/Rejected
* Enabled/Disabled
* Product linking

Artisan Promotions require IRTH approval.

Important S15.4 gap:

The Homepage promotion prototype still contains a legacy original-price display sourced from the old product price path.

Do NOT invent Market-aware promotion math before resolving the approved Shopping rules.

---

# 12. Coupon System

**Status: NOT IMPLEMENTED ⬜**

Coupon Engine remains MVP scope.

S15.4 is expected to establish the minimum Coupon foundation needed before Checkout.

---

# 13. Promotion Decisions Required Before S15.4 Calculation

These points are not yet fully approved:

## Promotion Overlap

If multiple active Promotions apply to the same Product:

* Priority?
* Best discount?
* Stack?
* Reject overlap?

A final rule is required before secure Promotion calculation.

## Fixed Promotion Amount Across Markets

Fixed-value discounts are currency-dependent.

The rule for scoping or applying fixed-value Promotions across Markets has not yet been approved.

This must be resolved before Market-aware fixed-discount calculation is used in Secure Shopping.

---

# 14. Market & Pricing Rules Already Approved

Do not reopen without a genuine technical/business conflict:

* Country and Market are separate concepts.
* Market activation is independent from Country activation.
* One local currency per Market in MVP.
* Product prices are Market-specific.
* No automatic FX conversion.
* Published Market-price changes require IRTH review.
* Previous approved live price remains live during a pending replacement request.
* Artisans may prepare prices for inactive Markets.
* Geo only suggests a Market.
* Customer confirms or changes the Market.
* Selected Market is stored in the customer session.
* No independent display-currency switch in MVP.
* Egypt is the approved Launch Market.
* Egypt Launch Market uses EGP.
* Legacy `products.price` must not be auto-mapped to Egypt/EGP.

---

# 15. Public Marketplace / Identity / Security Snapshot

Public Marketplace, Product Approval, Identity, and core marketplace security remain real.

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

Artisans must NOT receive:

* Customer phone
* Customer email
* WhatsApp
* Full address
* Direct contact information

---

# 16. Search

## Search Core

**Status: Real ✅**

Search uses the live public Marketplace catalog and supports:

* Products
* Artisans
* Countries
* Crafts

Current MVP ranking remains intentionally simple:

```text
Exact match     → highest
Starts with     → medium
Contains        → lower
```

## Full Search v0.1

**Status: PARTIAL 🟨**

Still missing/deferred:

* Autocomplete
* Story/content search
* Sales ranking
* Rating ranking
* Quality ranking

Some ranking inputs depend on future real Orders and Reviews.

---

# 17. Saved / Wishlist & Recently Viewed

**Status: PARTIAL 🟨**

Browser storage keeps product identity, while displayed product data is re-resolved from the live public Marketplace.

A hidden/unpublished product is therefore not exposed merely because stale browser state exists.

Account-level persistence remains later work.

---

# 18. Language / RTL / LTR

Foundation exists:

```text
RTL / LTR foundation       ✅
Language preference         ✅
Full Arabic UI              🟨
Full English UI             🟨
Translation architecture    ⬜
Final bilingual QA          ⬜
```

---

# 19. Design Status

Current state remains:

> **Functional Design Foundation**

The project should NOT stop for a full redesign before the MVP transaction journey works.

```text
Marketplace UX              🟨 Functional
Cart UX                     🟨 Secure foundation; polish later
Checkout UX                 🟧 Prototype
Orders UX                   🟧 Prototype
Returns UX                  ⬜
Payments UX                 ⬜
Artisan Dashboard UX        🟨 Mixed
Admin Dashboard UX          🟨 Mixed
Final Design System         ⬜
Final Product UX Review     ⬜
Final Mobile UX Pass        ⬜
Final Arabic/English QA     ⬜
```

---

# 20. Other Major Modules

## Shipping

**Status: NOT IMPLEMENTED ⬜**

Approved architecture:

> Shipping Layer remains separate from Order System.

MVP starts with one Courier, but the first Courier is not yet approved.

## Payment

**Status: NOT IMPLEMENTED ⬜**

Approved architecture:

> Payment Layer remains separate from Checkout.

MVP starts with one Payment Gateway, but the first Gateway is not yet approved.

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

## Payout

**Status: Prototype 🟧**

Payout is not immediately payable after sale.

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

Confirmed MVP requirement.

Final Return period, exclusions, and shipping responsibility still need approved decisions.

## Reviews

**Status: Prototype 🟧**

Real Reviews must depend on a real delivered Order / verified purchase.

Artisan reply remains subject to IRTH moderation.

## Notifications

**Status: Prototype 🟧**

Approved architecture:

> Notification Layer remains independent.

MVP channels:

```text
In-App
Email
```

## Wholesale

**Status: NOT IMPLEMENTED ⬜**

Wholesale Request is MVP scope and must preserve customer-contact privacy from Artisans.

---

# 21. Database Does NOT Yet Have Real Transactional Modules For

Exact future table names remain unapproved, but the Live database does not yet contain complete business modules for:

```text
persistent carts / cart items
orders / order items / internal order groups
shipments
payments / payment transactions
coupons
reviews
notifications
commission ledger
payouts / payout accounts
returns / refunds
wholesale requests
```

Do not create these all at once.

Build them according to dependency order.

---

# 22. Security Advisor / Security Notes

Current known Supabase Security Advisor warnings:

1. `public.review_product_market_price_request(...)` is a `SECURITY DEFINER` function executable by `authenticated`. The function performs an internal Super Admin authorization check, but its boundary should be reviewed/hardened in the appropriate Security/Polish pass rather than silently changing the already-closed S15.1 workflow.
2. Leaked Password Protection is disabled in Supabase Auth.

The S15.3 exact-price reader introduced **no new Security Advisor warning**.

`get_product_market_prices_text(...)` uses `SECURITY INVOKER` and existing RLS.

---

# 23. Known Technical Debt / Gaps

* Admin Artisans remains prototype.
* Admin Countries remains prototype.
* Admin Crafts remains prototype.
* Checkout / Complete Your Order remains insecure prototype until S15.5.
* Orders remain prototype.
* Notifications remain prototype.
* Reviews remain prototype.
* Commission UI remains prototype.
* Payout UI remains prototype.
* Sensitive payout/bank settings must eventually move to strict server-side storage.
* Full bilingual UI is incomplete.
* Search v0.1 is incomplete.
* Legacy `products.price` remains temporarily and must not be trusted for commerce.
* Homepage Promotion original-price display still uses legacy pricing and must be addressed in S15.4.
* Fixed-value Promotion behavior across Markets still needs an approved rule.
* Promotion overlap behavior still needs an approved rule.
* Made-to-Order Server Quote branch lacks a suitable current Live test fixture.
* Product page currently has non-blocking `next/image` optimization warnings for existing `<img>` usage.
* Full repository lint still contains older unrelated debt; focused Shopping lint passes.

---

# 24. Product Decisions Already Approved — Do Not Reopen Without Reason

Do NOT automatically reopen:

* IRTH is a handmade / heritage Marketplace.
* Arabic + English.
* Arabic RTL + English LTR.
* Mobile-First + Responsive.
* Craft is a primary Shop entry.
* Explore can start from Country.
* Search is comprehensive.
* Guest Checkout is allowed.
* Customer account creation is optional during purchase.
* Customer sees one Order.
* Order internally splits by Artisan / Shipment.
* Artisan does not receive sensitive customer contact information.
* Artisan does not directly contact customer.
* Product Approval exists in MVP.
* Artisan Promotions require IRTH approval.
* Reviews require a real delivered purchase.
* Artisan Review replies require IRTH moderation.
* One Super Admin in MVP.
* Commission can vary by Craft.
* Artisan commission override is allowed.
* Payout is delayed and not immediately payable after sale.
* Returns / Refunds are MVP.
* Payment Layer is separate from Checkout.
* Shipping Layer is separate from Order System.
* Notification Layer is separate.
* Start with one Payment Gateway.
* Start with one Courier.
* Search ranking remains simple for MVP.
* Advanced AI recommendations/search are Post-MVP.
* Country and Market are separate concepts.
* Market activation is independent from Country activation.
* One local currency per Market in MVP.
* Product prices are Market-specific and are not automatic FX conversion.
* Published Market-price changes require IRTH review while previous approved price remains live.
* Artisans may prepare prices for inactive Markets.
* Geo suggestion is never authoritative.
* Customer explicitly confirms/changes Market.
* Egypt is the Launch Market.
* Egypt Launch Market currency is EGP.
* Legacy Product prices are not automatically mapped to Egypt/EGP.

---

# 25. Decisions Still Needed Later

These points are NOT finalized unless separately approved later:

## First Payment Gateway

Not yet approved.

## First Courier

Not yet approved.

## Shipping Rules

Final market shipping cost and free-shipping threshold values are not yet approved.

## Return Window

No final period approved yet.

## Return Shipping Responsibility

Not yet fully decided.

## Payout Cycle

No final payout schedule approved yet.

## Promotion Overlap

Must be resolved for S15.4 secure Promotion calculation.

## Fixed Promotion Amount Across Markets

Must be resolved for S15.4 Market-aware fixed-discount calculation.

## Money Fixed Scale

PostgreSQL exact `numeric` is used, but the final fixed decimal scale policy has not yet been approved.

S15.3 does not require guessing this decision because exact prices are transported as text and calculated using decimal-string arithmetic.

---

# 26. Shopping Implementation Sequence

```text
S15.0
Database Migration Reconciliation ✅
        ↓
S15.1
Market & Pricing Foundation ✅
        ↓
S15.2
Market Selection ✅
        ↓
S15.3
Secure Cart / Server Quote ✅
        ↓
S15.4
Promotion Calculation + Coupon Foundation
        ← NEXT TASK
        ↓
S15.5
Checkout Foundation
        ↓
Shopping Integration Test
```

This sequence is an implementation plan derived from the approved architecture and does not replace the Specification.

---

# 27. CURRENT STATUS

```text
LAST CLOSED TASK:
S15.3 — Secure Cart / Server Quote ✅

CURRENT MAJOR POSITION:
Shopping Foundation

NEXT TASK:
S15.4 — Promotion Calculation + Coupon Foundation
```

---

# 28. NEXT TASK — S15.4

## S15.4 — Promotion Calculation + Coupon Foundation

**Status: READY FOR DISCUSSION / DECISIONS**

Primary goal:

Connect the existing Promotion foundation to trusted Market-aware Shopping calculation and establish the minimum Coupon foundation required before Checkout.

Before implementation, resolve the minimum business decisions that directly affect calculation, especially:

```text
Promotion overlap behavior
+
Fixed-value Promotion behavior across Markets/currencies
```

Do NOT silently invent these rules.

Do NOT rebuild Checkout during S15.4.

---

# 29. S15.5 Boundary

The following belongs to **S15.5 — Checkout Foundation**, not S15.4:

* Rebuilding `Complete your order`
* Trusted Checkout summary
* Customer shipping/contact input handling
* Guest Checkout implementation
* Secure transition from Cart Quote to Order creation
* Checkout-side server validation
* Removing localStorage Order creation

The current `/checkout` prototype may remain broken/inconsistent until S15.5 because S15.3 intentionally stopped trusting its old client-side price model.

---

# 30. DO NOT REOPEN

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
```

First determine whether any new problem can be solved within the approved architecture.

---

# 31. Definition of "Closed"

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

# 32. Project Working Method

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

Each task should have:

* Goal
* Expected result
* Files / database areas affected
* New terms explained
* Test method
* Final status

---

# 33. Change Log

## 30 August 2026 — S15.3 Closure

* Closed S15.3 — Secure Cart / Server Quote.
* Added server-authoritative Cart Quote API.
* Removed trust in browser-provided Product prices and totals.
* Added Product/public visibility validation to Server Quote.
* Added fixed-stock inventory validation and secure quantity update boundary.
* Tested price tampering protection.
* Tested duplicate slug aggregation.
* Tested missing Product protection.
* Tested invalid quantity rejection.
* Tested out-of-stock / insufficient-stock handling.
* Approved Egypt test Market price of 350 EGP for `clay-vessel` through the real price moderation workflow.
* Set controlled fixed inventory quantity to 5 through the ownership-checked inventory RPC.
* Integrated server-quoted Market price into Product Page and ProductCard.
* New Add-to-Cart behavior stores slug identity rather than browser price/name/artisan data.
* Verified Cart quantity 2 → unit price 350 EGP → subtotal 700 EGP.
* Added `get_product_market_prices_text(...)` so PostgreSQL `numeric` reaches Server Quote as exact text.
* Verified exact-money transport: `"350"` → `"700"` without JS floating-point price transport.
* Verified focused ESLint with zero errors.
* Verified final production Build and TypeScript compilation.
* Documented absence of a suitable published Made-to-Order Live test fixture instead of mutating production Business Data.
* Confirmed `Complete your order` is a legacy Checkout prototype and will be rebuilt in S15.5 instead of patched during S15.3.
* Confirmed S15.4 — Promotion Calculation + Coupon Foundation as next task.

## 30 August 2026 — S15.2 Closure

* Closed S15.2 — Market Selection.
* Added active Market API and session Market selection.
* Added Header Market Selector.
* Added ISO country codes.
* Added geo suggestion without automatic selection.
* Prevented guessing when a Country maps to multiple active Markets.
* Approved Egypt as Launch Market.
* Approved EGP as Egypt Launch Market currency.
* Confirmed legacy `products.price` is not automatically Egypt/EGP.
* Tested valid selection, invalid selection protection, stale Market clearing, geo suggestion, and multiple-Market ambiguity.

## 30 August 2026 — S15.1 Closure

* Closed S15.1 — Market & Pricing Foundation.
* Created `markets` and `product_market_prices`.
* Confirmed Country ≠ Market.
* Confirmed independent Market activation.
* Confirmed one local ISO currency per Market for MVP and no automatic FX conversion.
* Kept legacy `products.price` temporarily without guessed currency/Market mapping.
* Implemented Artisan Market-price proposal and Super Admin review workflow.
* Confirmed pending price changes do not overwrite current approved live price.
* Allowed Artisan pricing preparation for inactive Markets without public exposure.
* Passed controlled pricing workflow tests.

## 29 August 2026

* Completed full IRTH project audit.
* Confirmed S12 closed.
* Confirmed S13 closed.
* Confirmed S14 closed.
* Confirmed Public Marketplace security chain.
* Identified prototype Admin / Cart / Checkout / Orders areas.
* Completed S15.0 — Database Migration Reconciliation.
* Recovered missing Live migration history into Git.
* Verified fresh local migration replay.
* Reconciled Local and Remote migration history.
* Hardened public Product Storage visibility.

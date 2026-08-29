# IRTH Project Status

**Project:** IRTH
**Document Purpose:** Current implementation status of the IRTH MVP
**Last Updated:** 29 August 2026

---

# 1. Purpose of This Document

This document answers:

> **Where are we in the IRTH MVP right now?**

It is NOT the product specification.

The main project references are:

1. **IRTH MVP Specification v0.1**

   * Defines what IRTH should become.
   * Contains approved product and architecture decisions.

2. **IRTH_PROJECT_STATUS.md**

   * Defines what has actually been implemented.
   * Records completed milestones, current work, known gaps, and next tasks.

3. **Git Repository**

   * Source of truth for application code and migration files.

4. **Supabase**

   * Source of truth for the currently running database state.

If a product decision conflicts with the Specification, the Specification wins unless the decision is explicitly changed and approved.

---

# 2. Core Architecture

Approved architecture:

* Next.js
* TypeScript
* Supabase
* PostgreSQL
* Modular Monolith

MVP does NOT use Microservices.

Core principle:

> Build simple, but build it correctly.

Architecture should allow future expansion for:

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

Current high-level state:

```text
Foundation                  ✅ Core implemented
Identity & Structure        🟨 Mostly implemented
Marketplace                 ✅ Core implemented
Shopping                    ⬜ Real implementation not started
Orders                      ⬜ Prototype only
Money                       ⬜ Prototype / not implemented
Testing & Final Polish      ⬜ Later
```

Current project position:

```text
Discovery / Marketplace
        ✅
        ↓
Secure Shopping
        ← NEXT MAJOR PHASE
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

| Status | Meaning                                                               |
| ------ | --------------------------------------------------------------------- |
| ✅      | Real implementation exists and has been tested                        |
| 🟨     | Real foundation exists but feature is incomplete                      |
| 🟧     | UI / Prototype exists but does not count as completed business system |
| ⬜      | Not built yet                                                         |
| ⚠️     | Technical debt, gap, or issue requiring attention                     |

---

# 5. Closed Milestones

## S12 — Product Foundations

### S12.1 Inventory Foundation

**Status: CLOSED ✅**

Implemented:

* Product quantity
* Inventory foundation
* Product ownership rules
* Product lifecycle integration

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

# 6. S13 — Product Approval Workflow

**Status: CLOSED ✅**

Implemented real workflow:

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
* Super Admin approval
* Super Admin rejection
* Rejection reason
* Lifecycle status enforcement
* Product moderation security
* Artisan safe draft updates
* Super Admin review access

Public users cannot see products that are not published.

---

# 7. S14 — Public Marketplace DB Integration

**Status: CLOSED ✅**

Subtasks:

* S14.1 Artisan Public Page Integration ✅
* S14.2 Craft/Public Products Integration ✅
* S14.3 Country Page Integration ✅
* S14.4 Homepage + Promotions Integration ✅
* S14.5 Integration & Security Test ✅

---

# 8. Public Visibility Rule

Public Marketplace now follows this chain:

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

If any required parent entity becomes inactive, dependent public marketplace content becomes hidden.

This rule is enforced through both application logic and database security.

---

# 9. Public Marketplace Testing Completed

Verified:

```text
Draft Product
→ Hidden ✅

Pending Product
→ Hidden ✅

Published Product
→ Visible ✅

Inactive Artisan
→ Artisan + products hidden ✅

Inactive Craft
→ Craft + dependent artisan/product visibility hidden ✅

Inactive Country
→ Dependent marketplace content hidden ✅
```

Final controlled edge-case test:

Pottery was temporarily marked inactive inside a transaction.

Expected anonymous visibility:

```text
Clay Vessel                → hidden
Ahmed Hassan               → hidden
Ahmed artisan_crafts       → hidden
Pottery                     → hidden
Egypt                       → still visible
```

Test passed.

Transaction was rolled back.

Final database state was verified:

```text
Pottery       → active
Ahmed Hassan  → active
Clay Vessel   → published
Egypt         → active
```

---

# 10. Public Marketplace Pages

Real Supabase-backed public pages include:

```text
/
 /artisans
 /artisan/[slug]
 /countries
 /country/[slug]
 /crafts
 /product/[slug]
 /search
 /saved
 /recently-viewed
```

A shared public catalog layer exists:

```text
src/lib/publicMarketplace.ts
```

Purpose:

* Centralize public marketplace visibility rules.
* Prevent different pages from exposing different versions of the marketplace.
* Prevent Super Admin sessions from accidentally exposing private entities through public pages.

---

# 11. Legacy Route Cleanup

Legacy product/admin routes no longer implement separate business rules.

Examples:

```text
/product?slug=clay-vessel
→ /product/clay-vessel

/product/new
→ /artisan/products

/admin/review
→ /dashboard-admin/products

/admin/settings
→ /dashboard-admin/settings
```

Goal:

> One canonical route per business workflow.

---

# 12. Identity & Roles

Real Supabase authentication exists.

Roles:

```text
customer
artisan
super_admin
```

Implemented:

* Customer signup ✅
* Customer login ✅
* Artisan login ✅
* Super Admin login ✅
* Role-based routing ✅
* Protected dashboard routes ✅
* Single Super Admin database rule ✅
* Customer self-role creation limited to customer ✅

Customer cannot assign themselves:

```text
artisan
super_admin
```

---

# 13. Privacy & Security

Customer privacy is a core IRTH rule.

Artisans must NOT receive:

* Customer phone
* Customer email
* WhatsApp
* Full address
* Direct contact information

Public users must NOT receive internal artisan fields such as:

```text
auth_user_id
```

Anonymous access to sensitive artisan profile columns has been restricted.

Database grants have also been hardened.

Unnecessary privileges such as:

```text
TRUNCATE
TRIGGER
REFERENCES
```

were removed from public application roles where they were not needed.

---

# 14. Product Foundation

Real product database supports:

* Arabic name
* English name
* Arabic description
* English description
* Arabic story
* English story
* Arabic material
* English material
* Price
* Quantity
* Dimensions
* Weight
* Made-to-order
* Preparation time
* One-of-a-kind
* Customization
* Artisan
* Primary craft
* Lifecycle status

---

# 15. Artisan Product Management

**Status: Real ✅**

Artisan product dashboard uses:

* Supabase Auth
* Real artisan profile
* Real product rows
* Product lifecycle status
* Moderation requests
* Product media

Artisan ownership is enforced.

---

# 16. Super Admin Product Management

**Status: Real ✅**

Admin Product Moderation uses:

* Real products
* Real moderation requests
* Real artisans
* Real media
* Approval/rejection workflow

This is NOT localStorage prototype code.

---

# 17. Promotions

**Status: Foundation implemented and tested ✅**

Approved decision:

> Promotion ≠ Coupon

Promotion means automatic / campaign-based discounts.

Coupon means customer-entered code with eligibility rules.

Implemented promotion system supports:

* IRTH Promotion
* Artisan Promotion
* Percentage discount
* Fixed discount
* Start date
* End date
* Funding source
* Pending
* Approved
* Rejected
* Enabled / Disabled
* Product linking

Artisan promotions require IRTH approval.

Public promotions require:

```text
Approved
+
Enabled
+
Inside active date window
+
Published Product
+
Active Artisan
+
Active Craft
+
Active Country
```

---

# 18. Coupon System

**Status: NOT IMPLEMENTED ⬜**

Coupon Engine remains MVP scope.

Expected future support includes:

* Percentage
* Fixed value
* Minimum order
* Maximum discount
* Start/end dates
* Total usage limit
* Per-customer usage
* Product restrictions
* Craft restrictions
* Stackability
* Funding source
* Enable/disable

Coupon implementation should happen with the Shopping / Checkout system.

---

# 19. Search

## Search Core

**Status: Real ✅**

Search currently uses the live public marketplace catalog.

Searches:

* Products
* Artisans
* Countries
* Crafts

Current simple ranking:

```text
Exact match     → highest
Starts with     → medium
Contains        → lower
```

This is intentionally simple for MVP.

---

## Full Search v0.1

**Status: PARTIAL 🟨**

Still missing or deferred:

* Autocomplete
* Story/content search
* Sales ranking
* Rating ranking
* Quality ranking

Some ranking factors depend on real Orders and Reviews, so they should not be invented before those systems exist.

---

# 20. Saved / Wishlist

**Status: PARTIAL 🟨**

Current browser storage keeps product slugs.

Displayed product data is resolved again from the live public database.

Therefore:

If a saved product becomes unpublished or unavailable publicly, stale local data does not expose it.

Still required later:

* Account-level persistence
* Out-of-stock state
* Restock notification

---

# 21. Recently Viewed

**Status: PARTIAL 🟨**

Browser stores product slugs.

Live product data is resolved again from the public marketplace.

This prevents stale local data from exposing hidden products.

Later improvement:

* Customer-account persistence
* Cross-device history if required

---

# 22. Language / RTL / LTR

Foundation exists.

Implemented:

* Arabic locale state ✅
* English locale state ✅
* RTL direction ✅
* LTR direction ✅
* Browser language preference ✅

But full bilingual application content is NOT complete.

Current state:

```text
RTL / LTR foundation       ✅
Language preference         ✅
Full Arabic UI              🟨
Full English UI             🟨
Translation architecture    ⬜
Final bilingual QA          ⬜
```

---

# 23. Design Status

Current design must NOT be considered final product design.

Current state should be described as:

> Functional Design Foundation

Implemented foundations:

* IRTH visual direction
* Base color system
* Typography foundation
* Spacing foundation
* Card patterns
* Button patterns
* Responsive layouts
* Mobile-first foundation
* RTL/LTR foundation

Status:

```text
Visual Foundation                  ✅
Mobile-first Foundation            ✅
RTL/LTR Foundation                 ✅

Marketplace UX                     🟨 Functional
Full bilingual UX                  🟨 Incomplete

Cart UX                            🟧 Prototype
Checkout UX                        🟧 Prototype
Orders UX                          🟧 Prototype
Returns UX                         ⬜
Payments UX                        ⬜

Artisan Dashboard UX               🟨 Mixed
Admin Dashboard UX                 🟨 Mixed

Final Design System                ⬜
Final Product UX Review            ⬜
Final Mobile UX Pass               ⬜
Final Arabic / English QA          ⬜
```

The project should NOT stop now for a complete redesign.

Design approach:

```text
Business Rule
      ↓
UX Decision
      ↓
Implementation
      ↓
Testing
```

When the complete MVP journey works, IRTH should have a final dedicated:

```text
Final Product Design
+
UX Consolidation
+
Design System
+
Responsive Polish
+
Arabic / English QA
```

---

# 24. Admin Dashboard Status

Not all Admin pages are real database systems yet.

## Real

```text
Admin Product Moderation      ✅
Admin Promotions              ✅
Artisan Promotion Review      ✅
```

## Prototype / Needs DB Integration

```text
Admin Artisans                🟧
Admin Countries               🟧
Admin Crafts                  🟧
Admin Orders                  🟧
Admin Commission              🟧
Admin Reviews                 🟧
```

Important:

The existence of an Admin page does NOT mean its business module is complete.

---

# 25. Shopping — Current State

The real Shopping system has NOT been built yet.

This is the next major project phase.

---

# 26. Cart

**Status: Prototype 🟧**

Current Cart uses:

```text
localStorage("irth-cart")
```

It stores data including:

```text
slug
artisan
name
price
```

Current Cart calculates totals using client-provided prices.

This MUST NOT be used for real commerce.

Client-side prices cannot be trusted.

Future secure Cart should store/request product identity + quantity and allow the server/database to resolve:

```text
Current Market
Current Price
Inventory
Product availability
Promotion
Coupon
Shipping
```

before trusting totals.

---

# 27. Checkout

**Status: Prototype 🟧**

Current checkout:

```text
Reads cart from localStorage
        ↓
Uses client prices
        ↓
Collects customer details
        ↓
Creates JavaScript Order object
        ↓
Stores order in localStorage
        ↓
Stores notifications in localStorage
```

This is NOT a real checkout system.

Missing real components:

* Server price verification
* Inventory validation
* Market validation
* Promotion calculation
* Coupon validation
* Database Order
* Transaction
* Payment Layer
* Shipping Layer
* Internal artisan split

---

# 28. Guest Checkout

Approved MVP rule:

> Customer can buy as Guest.

Account creation during purchase is optional.

Real Guest Checkout implementation is still pending because the secure Checkout system has not been built yet.

---

# 29. Orders

**Status: Prototype 🟧**

Pages already exist:

```text
/account/orders
/artisan/orders
/dashboard-admin/orders
/order-success
```

But current order data is stored in:

```text
localStorage("irth-orders")
```

There is currently no real PostgreSQL Orders module.

---

# 30. Approved Order Architecture

Customer sees ONE order.

Internally IRTH splits the order by artisan / shipment.

Approved model:

```text
Customer Order
│
├── Artisan A
│   └── Shipment A
│
├── Artisan B
│   └── Shipment B
│
└── Artisan C
    └── Shipment C
```

Future Order architecture will likely require concepts such as:

```text
orders
order_items
internal artisan groups
shipments
status history
```

Exact table names are NOT approved yet.

---

# 31. Shipping

**Status: NOT IMPLEMENTED ⬜**

Approved architecture:

> Shipping Layer must remain separate from Order System.

MVP starts with one courier.

Architecture should allow additional couriers later.

Still not selected:

* First courier
* Final shipping configuration
* Shipping fees
* Free-shipping thresholds

---

# 32. Payment

**Status: NOT IMPLEMENTED ⬜**

Approved architecture:

> Payment Layer must remain separate from Checkout.

MVP starts with one payment gateway.

Architecture should support additional gateways later.

Important:

```text
Order Status
≠
Payment Status
```

Still not decided:

* First Payment Gateway

---

# 33. Market & Pricing Gap

This is a major architecture gap that must be solved before secure Cart.

Approved project direction is:

```text
Product
   ↓
Market
   ↓
Price
```

A product may have different market prices.

Example concept:

```text
Product A

Egypt   → EGP price
Saudi   → SAR price
UAE     → AED price
```

Market-specific pricing is NOT simply automatic currency conversion.

---

# 34. Current Database Pricing

Current `products` table still contains:

```text
price numeric
```

as one product-level price.

The live database currently does NOT contain:

```text
markets
product_market_prices
```

or equivalent market-pricing structures.

Therefore Market & Pricing Foundation must be designed before secure Cart.

---

# 35. Market Selection

**Status: NOT IMPLEMENTED ⬜**

Approved behavior:

```text
System suggests market
        ↓
Customer confirms / changes market
        ↓
Selected market is stored
        ↓
Prices / currency / shipping adapt
```

Geolocation should only suggest the market.

It must not force the user into a market.

---

# 36. Commission

**Status: Prototype 🟧**

Approved business logic:

```text
Craft Default Commission
        ↓
Optional Artisan Override
        ↓
Order Historical Snapshot
```

Current Admin Commission page does NOT represent the final system.

Real database support for:

* Craft commission
* Artisan override
* Historical order commission snapshot

still needs to be built.

---

# 37. Payout

**Status: Prototype 🟧**

Approved logic:

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

Payout does NOT become payable immediately after sale.

Current payout UI is only prototype.

---

# 38. Sensitive Payout Data

Current prototype stores payout/bank settings locally.

This is NOT acceptable for the final system.

Sensitive information such as:

* Bank account
* IBAN
* SWIFT
* Payout details

must eventually be stored securely server-side with strict authorization.

---

# 39. Returns & Refunds

**Status: NOT IMPLEMENTED ⬜**

Returns and Refunds are confirmed MVP requirements.

Expected high-level flow:

```text
Customer requests return
        ↓
Reason
        ↓
IRTH review
        ↓
Approve / Reject
        ↓
Return coordination
        ↓
Item received / inspected
        ↓
Refund
```

Still requiring future decisions:

* Return period duration
* Return shipping responsibility
* Specific exclusions
* Made-to-order / customized rules

These points must NOT be invented silently.

---

# 40. Reviews

**Status: Prototype 🟧**

Current prototype includes concepts for:

* Product rating
* Artisan rating
* Delivered-order requirement
* Customer edit
* Artisan reply
* Artisan reply moderation

But the current system uses localStorage.

Real Reviews must eventually depend on:

```text
Real delivered Order
        ↓
Verified Purchase
        ↓
Review
```

Artisan replies must continue requiring IRTH moderation.

---

# 41. Notifications

**Status: Prototype 🟧**

Approved architecture:

> Notification Layer should remain independent from the rest of the system.

MVP channels:

```text
In-App
Email
```

Later:

```text
SMS
WhatsApp
Push
```

Current notification system uses localStorage and contains prototype/hardcoded user logic.

Real Notification Layer still needs to be built.

---

# 42. Wholesale

Wholesale Request is part of the MVP.

Approved privacy flow:

```text
Customer
   ↓
Wholesale Request
   ↓
IRTH
   ↓
IRTH coordinates with Artisan
```

Customer contact details must not be passed directly to artisan.

**Status: NOT IMPLEMENTED ⬜**

---

# 43. Customization

Simple Product customization support exists in the product foundation.

**Status: MVP foundation ✅**

Advanced Custom Order system involving:

* Conversations
* Design revisions
* Quotes
* Custom project workflow

is Post-MVP.

---

# 44. Database Migration Reconciliation

**Status: CLOSED ✅**

The migration drift identified during the project audit has been reconciled.

Completed:

* Recovered missing migration files from Live Supabase migration history.
* Reconstructed missing Inventory, Product Media, Media Reorder, Artisan Product Read, RLS Auto-Enable, and ACL foundations.
* Verified a fresh Local database replay from repository migration history.
* Reconciled Local and Remote migration history.
* Reconstructed Live table, function, and default privilege state where required.
* Restored safe anonymous Artisan Profile column-level grants.
* Reconciled Promotion RPC privileges.
* Hardened public Product Storage visibility.
* Applied and verified the Storage hardening on Live Supabase.

Current public Product Storage access requires:

```text
Published Product
+
Active Artisan
+
Active Country
+
Active Craft
```

Result:

```text
Git migration history
        =
Reproducible database history
        =
Live migration history
```

---

# 45. Existing Database Does NOT Yet Have

At the time of this audit, the live database does NOT yet contain real transactional modules for:

```text
markets
product_market_prices

carts
cart_items

orders
order_items
internal order groups

shipments

payments
payment_transactions

coupons

reviews
notifications

commission ledger
payouts
payout accounts

returns
refunds

wholesale requests
```

Exact future table names are not yet approved.

---

# 46. Security Advisor

Last reviewed Supabase Security Advisor state:

No newly introduced marketplace security error remained.

Known existing warning:

```text
Leaked Password Protection Disabled
```

This is not currently treated as a marketplace architecture blocker.

Any change to Auth security settings should be discussed before changing production behavior.

---

# 47. Known Technical Debt / Cleanup

Known items:

* Admin Artisans still prototype
* Admin Countries still prototype
* Admin Crafts still prototype
* Cart uses client/localStorage prices
* Checkout is prototype
* Orders are prototype
* Notifications are prototype
* Reviews are prototype
* Commission page is prototype
* Payout page is prototype
* Payout bank settings are prototype and insecure for production use
* Full bilingual UI is incomplete
* Search v0.1 is incomplete
* Market Selector is missing
* Market pricing structure is missing

These should be addressed according to dependency order rather than all at once.

---

# 48. Product Decisions Already Approved — Do Not Reopen Without Reason

Do NOT automatically reopen these decisions:

* IRTH is a handmade / heritage marketplace.
* Arabic + English.
* Arabic RTL + English LTR.
* Mobile-First.
* Responsive.
* Craft is a primary Shop entry.
* Explore can start from Country.
* Search is comprehensive.
* Guest Checkout is allowed.
* Customer account creation is optional during purchase.
* Customer sees one Order.
* Order internally splits by artisan/shipment.
* Artisan does not receive sensitive customer contact information.
* Artisan does not directly contact customer.
* Product Approval exists in MVP.
* Artisan Promotions require IRTH approval.
* Reviews require a real delivered purchase.
* Artisan review replies require IRTH moderation.
* One Super Admin in MVP.
* Commission can vary by craft.
* Artisan commission override is allowed.
* Payout is delayed and not immediately payable after sale.
* Returns/Refunds are MVP.
* Payment Layer is separate from Checkout.
* Shipping Layer is separate from Order System.
* Notification Layer is separate.
* Start with one Payment Gateway.
* Start with one Courier.
* Search ranking remains simple for MVP.
* Advanced AI recommendations/search are Post-MVP.

---

# 49. Decisions Still Needed Later

These are NOT finalized yet.

## Launch Market

Which market is the first operational launch market?

Not yet approved.

---

## Payment Gateway

Which Payment Gateway will be used first?

Not yet approved.

---

## Courier

Which shipping/courier provider will be used first?

Not yet approved.

---

## Shipping Rules

Final market shipping costs and free-shipping thresholds.

Not yet approved.

Examples used in design discussions must not be treated as final production rules.

---

## Return Window

Examples:

```text
7 days
14 days
...
```

No final period approved yet.

---

## Return Shipping Responsibility

Not yet fully decided.

---

## Payout Cycle

Examples:

```text
Weekly
Biweekly
Monthly
```

No final payout schedule approved yet.

---

## Promotion Overlap

If multiple active promotions apply to the same product:

* Priority?
* Best discount?
* Stack?
* Reject overlap?

No final rule approved yet.

Must be decided before final Shopping discount calculation.

---

# 50. Recommended Next Phase

Proposed organizational name:

```text
S15 — Shopping Foundation
```

IMPORTANT:

This numbering is a project-management recommendation and is not itself an official Specification section unless explicitly approved.

---

# 51. Recommended First Task

## S15.0 — Database Migration Reconciliation

**Status: CLOSED ✅**

Goal:

Reconcile:

```text
Live Supabase migration history
```

with:

```text
supabase/migrations/
```

inside Git.

Expected result:

```text
Fresh database
+
Repository migrations
=
Expected IRTH database structure
```

Completed:

* Recovered missing migration files from Live Supabase history.
* Reconstructed missing Inventory, Product Media, Media Reorder, Artisan Product Read, RLS Auto-Enable, and ACL foundations.
* Verified fresh Local database replay from migration history.
* Reconciled Local and Remote migration history.
* Reconstructed Live table, function, and default privilege state.
* Fixed anonymous Artisan Profile column-level grants.
* Reconciled Promotion RPC privileges.
* Hardened public Product Storage visibility to require:
  * Published product
  * Active artisan
  * Active country
  * Active craft
* Applied the Storage security hardening to Live Supabase.
* Verified the resulting Live Storage policy.

Result:

```text
Git migration history
        =
Reproducible database history
        =
Live migration history
```

---

# 52. Recommended Task After Migration Reconciliation

## S15.1 — Market & Pricing Foundation

Reason:

Secure Cart cannot be designed correctly before the system knows:

```text
Which Market?
      ↓
Which Currency?
      ↓
Which Product Price?
      ↓
Is Product available?
      ↓
Shipping rules?
      ↓
Promotion?
```

Therefore:

```text
Market
   ↓
Trusted Price
   ↓
Secure Cart
   ↓
Checkout
   ↓
Real Order
```

is preferred over building Cart around the current global `products.price`.

---

# 53. Proposed Shopping Sequence

Recommended sequence:

```text
S15.0
Database Migration Reconciliation
        ↓
S15.1
Market & Pricing Foundation
        ↓
S15.2
Market Selection
        ↓
S15.3
Secure Cart / Server Quote
        ↓
S15.4
Promotion Calculation + Coupon Foundation
        ↓
S15.5
Checkout Foundation
        ↓
Shopping Integration Test
```

This sequence has NOT replaced the Specification.

It is an implementation plan derived from the approved architecture.

---

# 54. Future Major Phases — Proposed

After Shopping:

```text
Orders Foundation
      ↓
Shipping + Tracking
      ↓
Payments / Money
      ↓
Returns / Refunds
      ↓
Reviews
      ↓
Notifications
      ↓
Final Product Design
      ↓
Full MVP Testing & Polish
```

Exact milestone numbering should be approved as the project progresses.

---

# 55. Final Design Strategy

IRTH's current UI is NOT considered final.

Design should evolve with the real Business Rules.

For each new module:

```text
Understand Business Rule
        ↓
Define UX
        ↓
Implement
        ↓
Test
```

After the complete MVP transaction journey works, run a dedicated:

```text
Final Product Design & UX Consolidation
```

covering:

## Customer

* Homepage
* Navigation
* Search
* Explore
* Product
* Artisan
* Craft
* Country
* Saved
* Recently Viewed
* Cart
* Checkout
* Account
* Orders
* Tracking
* Returns
* Reviews
* Notifications

## Artisan

* Dashboard
* Products
* Product editor
* Inventory
* Media
* Orders
* Promotions
* Reviews
* Payouts
* Settings

## Super Admin

* Dashboard
* Product moderation
* Artisans
* Countries
* Crafts
* Promotions
* Orders
* Returns
* Reviews
* Commissions
* Payouts
* Settings

---

# 56. Final Design System — Later

Final design phase should consolidate reusable components such as:

```text
Typography
Colors
Spacing
Radius
Shadows

Buttons
Inputs
Selects
Checkboxes
Radio controls

Cards
Product Cards

Tabs
Badges
Status Chips

Tables

Dialogs
Drawers
Modals

Toast Messages

Loading States
Skeletons
Empty States
Error States
```

---

# 57. Arabic / English Final QA

Final bilingual review must include:

* Arabic typography
* English typography
* RTL alignment
* LTR alignment
* Icon direction
* Back arrows
* Breadcrumb direction
* Currency formatting
* Number formatting
* Date formatting
* Mixed Arabic / English strings
* Mobile behavior

---

# 58. Mobile Final QA

IRTH is Mobile-First.

Final UX review should validate:

* Navigation
* Search
* Filters
* Product page
* Sticky actions if approved
* Cart
* Checkout
* Order tracking
* Artisan dashboard
* Admin dashboard
* Tables on small screens
* Forms
* Modals / drawers

Any new product decision discovered during this stage must still follow:

```text
Question
↓
Discussion
↓
Options
↓
Owner Decision
↓
Approval
↓
Implementation
```

---

# 59. CURRENT STATUS

```text
LAST CLOSED MAJOR MILESTONE:
S15.0 — Database Migration Reconciliation ✅

CURRENT MAJOR POSITION:
Shopping Foundation

NEXT TASK:
S15.1 — Market & Pricing Foundation
```

---

# 60. CURRENT TASK

```text
S15.1 — Market & Pricing Foundation
```

Status:

```text
READY FOR DISCUSSION / DECISIONS
```

Before implementation, review the approved Market architecture and identify any remaining product decisions.

Do NOT assume a first launch market without explicit approval.

---

# 61. NEXT TASK

After S15.0:

```text
S15.1 — Market & Pricing Foundation
```

Before implementation:

Need to review the approved Market architecture and identify any remaining product decisions.

Do NOT assume a first launch market without explicit approval.

---

# 62. DO NOT REOPEN

Unless there is a genuine technical/business conflict, do not reopen:

```text
S12 Inventory Foundation
S12 Media Foundation
S13 Product Approval Workflow
S14 Public Marketplace DB Integration
```

Do not replace existing architecture simply because a new implementation problem appears.

First determine whether the problem can be solved within the approved architecture.

---

# 63. Definition of "Closed"

A task is only CLOSED when:

1. Business rule is understood.
2. Required decision is approved.
3. Implementation exists.
4. Security implications are reviewed.
5. Expected flow is tested.
6. Edge cases are reviewed where relevant.
7. No known blocker remains.
8. IRTH_PROJECT_STATUS.md is updated.

A page existing in the repository does NOT mean the feature is closed.

---

# 64. Project Working Method

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

Each Task must have:

* Goal
* Expected result
* Files / database areas affected
* New terms explained
* Test method
* Final status

---

# 65. Status Document Update Rule

After every closed Task update:

```text
Last Updated
Closed Milestones
Current Task
Next Task
Known Gaps
Design Status
Technical Debt
Decisions Needed
```

Add important milestones to the Change Log.

---

# 66. Change Log

## 29 August 2026

* Completed full IRTH project audit.
* Confirmed S12 closed.
* Confirmed S13 closed.
* Confirmed S14 closed.
* Confirmed Public Marketplace security chain.
* Verified inactive Craft edge case.
* Identified Admin prototype pages.
* Identified Cart / Checkout / Orders localStorage prototypes.
* Identified missing Market Pricing foundation.
* Identified Supabase ↔ Git migration drift.
* Confirmed current design is Functional Design Foundation, not Final Product Design.
* Recommended Shopping Foundation as next major implementation phase.
* Recommended Database Migration Reconciliation as first next task.
* Completed S15.0 — Database Migration Reconciliation.
* Recovered missing Live migration history into Git.
* Reconstructed missing Inventory, Media, RLS helper, and ACL foundations.
* Verified full fresh Local database replay.
* Reconciled Local and Remote migration history.
* Hardened public Product Storage visibility.
* Applied and verified the Storage security hardening on Live Supabase.
* Confirmed S15.1 — Market & Pricing Foundation as the next task.

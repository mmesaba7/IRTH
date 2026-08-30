# IRTH — S15.4 Decision & Implementation Register

**Date:** 30 August 2026  
**Scope:** Secure Shopping — Promotions + Coupons  
**Relationship to project docs:**

- `IRTH MVP Specification v0.1` remains the Product/Architecture source of truth.
- `IRTH_PROJECT_STATUS.md` remains the project implementation status source of truth.
- This register preserves the detailed S15.4 decisions and their implementation/test state so no approved commerce rule is lost between chats or implementation slices.

---

# 1. Approved S15.4 Commerce Decisions

## 1A — Best Promotion Wins
If multiple active eligible Product Promotions apply to one Product, apply exactly one: the Promotion with the largest actual monetary discount in the selected Market.

## 2A — Promotion / Coupon Market Scope
Every Promotion and Coupon belongs to exactly one Market. Legacy Promotions are never silently assigned to Egypt or another Market.

## 3A — Fixed Product Promotion
A Fixed Product Promotion is per-unit, then multiplied by requested quantity.

## 4A — Promotion Exact Tie
If an Artisan Promotion and IRTH Promotion produce the exact same monetary discount, the Artisan Promotion wins to avoid unnecessary IRTH subsidy.

## 5A — One Coupon Per Cart
MVP allows one Coupon per Cart/Order. `stackable` means Coupon + Product Promotion, not multiple Coupons.

## 6A — Stackable Order
For a stackable Coupon: apply Product Promotion first, then calculate the Coupon on the post-Promotion eligible amount.

## 7A — Non-stackable Comparison
For a non-stackable Coupon: compare Promotion-only vs Coupon-only and choose the customer-best result. Applying a Coupon must never make the price worse.

## 8A — Restrictions OR / Union
Coupon eligibility is the union of explicitly selected Products and configured Crafts. No restrictions means all otherwise eligible merchandise in the Coupon Market.

## 9A — Minimum Order
Minimum Order is evaluated against Coupon-eligible merchandise subtotal. For stackable Coupons, use the post-Promotion, pre-Coupon eligible amount.

## 10A — Fixed Coupon
A Fixed Coupon is cart-level once and capped at eligible subtotal. `max_discount_amount` is meaningful only for Percentage Coupons.

## 11A — Fixed Coupon Allocation
A Fixed Coupon discount is allocated proportionally across eligible lines using exact decimal arithmetic and deterministic remainder handling.

## 12A — Artisan-funded Coupon Scope
An Artisan-funded Coupon belongs to exactly one Artisan and only discounts that Artisan's eligible Products. IRTH-funded Coupons may span multiple Artisans.

## 13A — Customer Discount vs Funding Attribution
Customer discount and funding attribution are separate trusted outputs. Commission/Payout calculation is not part of S15.4.

## 14A — Usage Consumption
Coupon usage is not consumed during Quote/Apply. Real consumption happens only inside the future Order creation transaction after server revalidation.

## 15A — Per-customer Usage
The data model for per-customer usage exists now. Identity enforcement is completed with Checkout/Identity. Do not invent a Guest identity and do not force account creation.

## 16A — Code Normalization
Coupon code matching is case-insensitive and trimmed.

## 17A — Time Semantics
Active window is `start_at <= server now < end_at`.

## 18A — Exact Money
Money uses exact currency-aware decimal arithmetic and the selected currency's minor-unit scale. EGP currently has two fraction digits, but this is not a global rule.

## 19A — Percentage Product Promotion
Percentage Product Promotion is line-level: normalize Market unit price to the currency minor unit, multiply by quantity, calculate the percentage on the whole line, then round once.

## 20A — Rounding
Financial rounding in S15.4 uses Round Half-Up to the selected currency minor unit.

## 21A — Percentage Coupon Calculation
A Percentage Coupon is calculated once on the total Coupon-eligible subtotal, then Round Half-Up once. It is not calculated line-by-line.

## 22A — Coupon Allocation
After the Coupon discount is known, allocate it proportionally across eligible lines. Remainder units go by largest fractional remainder; exact ties use `product_id` as a deterministic tie-breaker.

## 23A — Non-stackable Exact Tie
If Promotion-only and Coupon-only produce the exact same customer total, Promotion-only wins. The customer pays the same amount, while Coupon usage/funding is not consumed unnecessarily.

## 24A — Non-stackable Scope Is Limited to Coupon-eligible Lines
For a non-stackable Coupon, Promotion-only vs Coupon-only comparison applies only to Coupon-eligible lines. Promotions on lines outside the Coupon's eligibility scope remain active in both scenarios and are not suppressed by applying the Coupon.

---

# 2. Supplemental Database / Security Decisions

## DB-B1 — Coupon Redemption Ledger
Use `coupon_redemptions` as an audit ledger instead of a counter-only model.

Current foundation:

- `coupon_id`
- `customer_user_id` nullable
- `consumed_at`

No fake `order_id` exists before the real Orders module. A real `order_id -> orders.id` relationship must be added before the first real Coupon consumption.

## DB-B2 — Coupon Code Uniqueness
Coupon code is unique per Market, not globally.

Within the same Market, trimmed/case-normalized variants are the same code. The same normalized code may exist in another Market.

## SEC-B1 — Secure Coupon Lookup Boundary
The client must not receive direct general read access to the `coupons` table.

Approved boundary:

```text
Client Coupon Code
        ↓
Public SECURITY INVOKER RPC wrapper
        ↓
Private SECURITY DEFINER validation/lookup function
        ↓
Single matching Market-scoped eligible Coupon metadata
```

The lookup must not expose a Coupon-code list and must not create a Redemption.

---

# 3. Approved S15.4 Money Pipeline

```text
Market Price
    ↓
Best Product Promotion
    ↓
Stackable Coupon after Promotion
OR
Non-stackable Promotion-only vs Coupon-only comparison
(on Coupon-eligible lines only)
    ↓
Funding Split
    ↓
Trusted Discounted Merchandise Total
```

---

# 4. Implementation Status

## S15.4.1 — Promotion Market Scope + Money Storage

**Status: CLOSED ✅**

Implemented:

- Promotions are Market-scoped.
- `discount_value` uses PostgreSQL `numeric` without a global 2-decimal storage scale.
- Promotion create/read RPCs are Market-aware.
- Commerce eligibility requires matching active Market price.
- Commerce does not use legacy `products.price` as trusted Market price.
- Public wrappers remain `SECURITY INVOKER`; sensitive logic remains in `private` functions.

Migration:

```text
supabase/migrations/20260830140249_scope_promotions_to_markets.sql
```

Verification:

- Local reset passed.
- Remote `db push` passed.
- Artisan create → pending → Admin approval → active flow passed.
- Homepage active-promotion integration passed.

## S15.4.2 — Promotion Calculation in Secure Server Quote

**Status: CLOSED ✅**

Implemented:

- `src/lib/promotionQuote.ts` server-only calculation layer.
- Exact string/integer money arithmetic compatible with current project target.
- Best Promotion Wins by actual monetary discount.
- Fixed per-unit Promotion.
- Percentage line-level Promotion.
- Currency-aware minor-unit scale.
- Round Half-Up.
- Promotion funding split: IRTH vs Artisan.
- `/api/cart/quote` applies Promotions after the base trusted quote.
- Homepage displays only the winning Promotion for each Product and uses Market currency rather than a fixed `$` symbol.

Verified examples:

- Artisan 10% on 350 EGP → discount 35.00 → final 315.00.
- Exact monetary tie against IRTH 35.00 → Artisan wins.
- Focused ESLint has zero errors; one older `img` optimization warning is unrelated.

Primary files:

```text
src/lib/promotionQuote.ts
src/app/api/cart/quote/route.ts
src/app/page.tsx
```

## S15.4.3 — Coupon DB Foundation

**Status: CLOSED ✅**

Implemented tables:

```text
coupons
coupon_products
coupon_crafts
coupon_redemptions
```

Implemented protections:

- Required Market scope.
- Per-Market case-insensitive normalized code uniqueness.
- Percentage/Fixed validation.
- Positive discount/minimum/max/usage-limit constraints.
- `max_discount_amount` restricted to Percentage Coupons.
- IRTH/Artisan funding integrity.
- Product/Craft restriction tables.
- RLS enabled on all Coupon tables.
- `anon` has no direct grants.
- `coupon_redemptions` has no authenticated INSERT/UPDATE/DELETE grant.
- Super Admin-only administration policies.
- `coupons.created_by` covering index added after Advisor review.

Migrations:

```text
supabase/migrations/20260830154952_create_coupon_foundation.sql
supabase/migrations/20260830160633_add_coupon_created_by_index.sql
```

Verification:

- DDL dry-run in transaction + rollback passed.
- Same-Market normalized duplicate code rejected.
- Untrimmed code rejected.
- Invalid Fixed Coupon `max_discount_amount` rejected.
- Same normalized code in another Market allowed.
- Full local database replay/reset passed.
- Remote `db push` passed.
- Remote tables, constraints, indexes, RLS, grants and policies verified.
- Coupon-created unindexed-FK Advisor warning removed.

## S15.4.4 — Coupon Calculation

**Status: CURRENT 🟨 — IMPLEMENTATION IN GIT, VERIFICATION PENDING**

Approved:

- 21A Percentage Coupon calculation.
- 22A proportional allocation and deterministic remainder.
- 23A Promotion-only wins an exact non-stackable tie.
- 24A non-stackable comparison affects Coupon-eligible lines only.
- SEC-B1 secure Coupon lookup RPC boundary.

Implemented in Git so far:

- `supabase/migrations/20260830163234_add_secure_coupon_lookup.sql`.
- Private `SECURITY DEFINER` Coupon lookup with pinned empty `search_path`.
- Public `SECURITY INVOKER` wrapper.
- Narrow return surface: one matching Coupon plus server-resolved eligible Product IDs.
- Product eligibility boundary re-checks published Product, active Artisan/Craft/Country and active Market price.
- Coupon money values return as text for exact JavaScript-side arithmetic.
- Total usage limit is checked without consuming usage.
- `src/lib/couponQuote.ts` server-only calculation layer.
- Percentage Coupon calculation on total eligible subtotal once.
- Fixed Coupon cap at eligible subtotal.
- Percentage `max_discount_amount` cap.
- Minimum-order check on the approved stackable/non-stackable basis.
- Proportional line allocation using largest fractional remainder and deterministic `product_id` ties.
- Stackable Coupon after Promotion.
- Non-stackable eligible-line Promotion-only vs Coupon-only comparison.
- 23A exact tie → Promotion preferred.
- 24A non-eligible lines retain their Promotions.
- Coupon funding split: IRTH vs Artisan.
- Optional `couponCode` parsing in `/api/cart/quote`; no client price/discount/total is trusted.
- Quote does not create `coupon_redemptions` rows.

Verification completed before local migration application:

- Secure Coupon lookup DDL dry-run passed inside a transaction.
- Invalid Coupon lookup returned zero rows.
- Dry-run rollback confirmed no Coupon lookup functions remained on Remote.
- Exact integer division/proportional-allocation helper checks passed for representative allocations.

Still required before S15.4.4 can close:

- Pull latest Git changes locally.
- Full local `supabase db reset` including the secure Coupon lookup migration.
- Focused ESLint / TypeScript production build.
- Remote `db push` after local migration replay passes.
- Remote function privileges/security verification and Advisors.
- Controlled calculation edge tests for stackable, non-stackable, minimum, max cap, restrictions, funding, tie and rounding.

Usage must still **not** be consumed during Quote.

---

# 5. S15.4 Boundary — Do Not Scope-Creep

S15.4 does not implement:

- Commission calculation.
- Payout calculation.
- Real Order creation.
- Real Coupon consumption.
- Guest identity invention.
- Payment.
- Shipping.

Those remain in their approved later modules.

---

# 6. Documentation Rule Going Forward

When a new approved decision affects any of the following, record it before closing the task:

- Database
- Security
- Marketplace Logic
- Money
- Orders
- Payments
- Shipping
- Commission/Payout

For each decision, document:

```text
Decision
↓
Implementation state
↓
Verification/test state
↓
Migration/files affected
```

This prevents approved rules from living only in chat history.

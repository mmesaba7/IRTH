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

**Status: CLOSED ✅**

Implemented:

- `supabase/migrations/20260830163234_add_secure_coupon_lookup.sql`.
- Private `SECURITY DEFINER` Coupon lookup with pinned empty `search_path`.
- Public `SECURITY INVOKER` wrapper.
- Narrow lookup return surface: one matching Coupon plus server-resolved eligible Product IDs.
- Lookup validates active Market, normalized code, active time window, enabled state and total usage limit.
- Product eligibility re-checks published Product, active Artisan/Craft/Country and active Market price.
- Artisan-funded Coupon scope is enforced at the trusted lookup boundary.
- `src/lib/couponQuote.ts` server-only calculation layer.
- Percentage Coupon calculated once on total eligible subtotal.
- Fixed Coupon applied cart-level once and capped at eligible subtotal.
- Percentage `max_discount_amount` cap.
- Minimum-order semantics use the approved stackable/non-stackable basis.
- Exact currency-aware string/integer arithmetic with Round Half-Up.
- Proportional line allocation uses largest fractional remainder; exact ties use `product_id`.
- Stackable Coupon applies after Product Promotion.
- Non-stackable comparison is limited to Coupon-eligible lines.
- 23A exact tie keeps Promotion-only.
- 24A preserves unrelated Promotions outside Coupon scope.
- Coupon funding split is tracked separately for IRTH vs Artisan.
- `/api/cart/quote` accepts optional `couponCode`; client prices/discounts/subtotals/totals are never trusted.
- Quote does not consume Coupon usage or create Redemption rows.

Primary files:

```text
supabase/migrations/20260830163234_add_secure_coupon_lookup.sql
src/lib/couponQuote.ts
src/app/api/cart/quote/route.ts
supabase/seed.sql
scripts/test-coupon-e2e.mjs
package.json
```

Verification completed:

- Full local migration replay/reset passed, including Coupon lookup migration and local-only test seed.
- Production Build / TypeScript passed.
- Secure Coupon lookup migration pushed to Remote successfully.
- Remote function modes verified: private lookup `SECURITY DEFINER`, public wrapper `SECURITY INVOKER`.
- Remote function privileges / narrow access boundary verified.
- Plain authenticated user cannot read Coupon rows through RLS.
- Security Advisor showed no new S15.4.4-specific warning.
- Code normalization test passed.
- Wrong-Market and invalid Coupon tests passed.
- Expired Coupon and exhausted total-usage tests passed.
- Product restriction and Artisan-funded scope tests passed.
- Quote lookup produced no Redemption consumption at the DB boundary.
- Local E2E test passed through the real `/api/cart/quote` path.
- Stackable Percentage and Fixed Coupons passed.
- Proportional allocation and deterministic remainder tie-break passed.
- Non-stackable Coupon-win, Promotion-win, and exact-tie paths passed.
- Decision 24A passed: Promotions on Coupon-ineligible lines remain active.
- Minimum order, Percentage max cap, Round Half-Up, Product/Craft restriction union, and Artisan funding attribution passed.

Final E2E command:

```text
npm.cmd run test:coupon-e2e
```

Final result:

```text
PASS S15.4.4 coupon quote E2E
```

Usage remains intentionally **not consumed during Quote**. Real Coupon consumption belongs to the future Order creation transaction after server-side revalidation.

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

# 6. Next S15.4 Task

## S15.4.5 — Cart UI

**Status: NEXT**

Goal:

Expose the already trusted Promotion/Coupon quote outputs in the Cart UX without duplicating commerce calculation on the client.

The UI must consume server-authoritative values from `/api/cart/quote` and must not calculate trusted discounts locally.

---

# 7. Documentation Rule Going Forward

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

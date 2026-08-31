# IRTH — M1.1 Commission Settlement Ledger Foundation — Closure

**Date:** 31 August 2026  
**Status:** CLOSED ✅  
**Phase:** 6 — Money  
**Migration:** `20260831152241_create_money_settlement_ledger_foundation.sql`

---

# 1. Goal

M1.1 converts the trusted historical Order Item money snapshots into an auditable settlement foundation without introducing Payment Gateway execution, Refund execution, payout-account data or real Payout execution.

The implementation reuses the existing Market Pricing, Promotions, Coupons, Order transaction and commission-rate snapshot foundations.

---

# 2. Approved Settlement Rule

Artisan-funded discounts reduce both the Artisan settlement base and the Commission base.

IRTH-funded discounts do not reduce the Artisan's economic entitlement or the Commission base; IRTH funds those discounts separately.

For each Order Item the initial sale settlement is represented by exactly three entries:

```text
merchandise_proceeds
+ IRTH-funded discount subsidy
- commission
= Artisan entitlement before tax / withholding adjustments
```

Commission base:

```text
line_total
+ promotion_funding_irth
+ coupon_funding_irth
```

Commission amount:

```text
RoundHalfUp(commission_base × snapshotted_commission_rate / 100)
```

The Commission rate is the historical rate already snapshotted on the Order Item.

---

# 3. Currency Precision

`public.markets` now has mandatory `currency_minor_unit_scale` configuration.

Current Egypt launch configuration:

```text
EGP → 2 decimal places
```

A Market without this configuration fails closed rather than allowing settlement arithmetic with an assumed precision.

---

# 4. Database Foundation

Created private table:

```text
private.artisan_settlement_ledger
```

Important properties:

- Not directly readable or writable by `anon` or `authenticated`.
- `service_role` has read access but no direct insert access.
- Sale entries are written through an internal private trigger boundary.
- Ledger UPDATE and DELETE operations are blocked by an append-only guard.
- Entries have deterministic `entry_key` values for historical identity.
- Monetary values are constrained to the Market currency precision.
- Commission entries preserve their calculation base and historical rate.
- Future auditable adjustment support has reason/reference/actor/time fields without inventing tax rules now.

Additional Order Item integrity constraints now require:

- Promotion discount = IRTH-funded promotion amount + Artisan-funded promotion amount.
- Coupon discount = IRTH-funded coupon amount + Artisan-funded coupon amount.
- Final item line total = original line total - promotion discount - coupon discount.

---

# 5. Atomic Order Integration

A private `AFTER INSERT` trigger on `public.order_items` creates the three sale-settlement entries.

Because the trigger executes inside the same PostgreSQL transaction as Order creation:

```text
Order Item insert
↓
Settlement entries
↓
Same transaction commits
```

If settlement creation fails, the Order transaction cannot partially commit that Order Item without its settlement records.

This avoids duplicating the existing secure Order creation business logic.

---

# 6. Existing Order Backfill

Before implementation, Live DB integrity review found:

```text
Orders:                     2
Order Items:                2
Bad Promotion funding:      0
Bad Coupon funding:         0
Bad line-total snapshots:   0
```

Both existing Order Items were backfilled.

Verified result:

```text
Ledger entries:                  6
Distinct Order Items covered:    2
Merchandise entries:             2
IRTH subsidy entries:            2
Commission entries:              2
Items without exactly 3 entries: 0
```

Commission formula verification:

```text
Checked Order Items: 2
Correct Order Items: 2
```

---

# 7. Security Verification

Verified privileges:

```text
anon SELECT ledger:               false
authenticated SELECT ledger:      false
authenticated INSERT ledger:      false
service_role SELECT ledger:       true
service_role direct INSERT:       false
```

Verified database guards:

- Append-only UPDATE/DELETE trigger exists.
- Order Item → Settlement Ledger trigger exists.
- Controlled mutation test confirmed historical ledger rows cannot be updated.
- Controlled new-Order-Item test confirmed exactly three settlement entries are created; the entire test was rolled back afterward.
- Final Live DB counts remained unchanged after controlled tests.

Final controlled state:

```text
Orders:        2
Order Items:   2
Ledger rows:   6
Test leakage:  0
```

Supabase Security Advisor showed no new M1.1-specific security WARN. Existing unrelated project warnings remain unchanged:

- Legacy authenticated-executable `review_product_market_price_request(...)` SECURITY DEFINER warning.
- Supabase Auth Leaked Password Protection disabled.

Relevant remediation references:

- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Performance Advisor reported only expected unused-index notices for the newly created ledger indexes; there were no new unindexed foreign-key findings for the ledger.

---

# 8. Scope Boundary

M1.1 does **not** implement:

- Online Payment Gateway.
- COD collection confirmation lifecycle.
- Payment transaction history.
- Returns / Refund execution.
- Final Return Window.
- Tax / withholding rules.
- Payout eligibility.
- Artisan Bank Account storage.
- Bank Transfer execution.
- Money UI replacement.

Those remain in their approved later Phase 6 modules.

---

# 9. Result

**M1.1 — Commission Settlement Rules + Ledger Foundation is CLOSED ✅.**

Next planned Phase 6 task:

```text
M2 — Provider-independent Payment Core Foundation
```

Before M2 implementation, its Payment status model, transaction/event boundaries, COD lifecycle and pending-online-payment stock-recovery behavior must be reviewed against the approved Money decisions.

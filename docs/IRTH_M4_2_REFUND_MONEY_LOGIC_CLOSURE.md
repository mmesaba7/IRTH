# IRTH M4.2 — Refund Money Logic Closure

**Date:** 31 August 2026  
**Status:** CLOSED ✅

## Scope

M4.2 implements provider-independent Refund calculation and trusted financial completion on top of the M4.1 Return foundation.

Approved rules implemented:

- Refund granularity remains Order Item + Quantity.
- Customer merchandise refund is based on trusted historical sale amounts after discounts.
- Shipping is not automatically refunded; an explicit IRTH-controlled shipping refund amount is required and cannot exceed remaining Order shipping.
- Settlement history is not rewritten. Refund effects are new append-only ledger entries.
- IRTH-funded discounts and Artisan-funded economics remain distinct.
- Browser/client cannot declare Refund success.
- Real Payment Gateway execution remains deferred; the trusted completion boundary is provider-independent.

## Migration

```text
20260831172254_create_refund_money_logic_foundation
```

Git migration:

```text
supabase/migrations/20260831172254_create_refund_money_logic_foundation.sql
```

## Refund domain

Created private tables:

```text
private.refunds
private.refund_items
```

Refund records snapshot:

- Return Request.
- Order.
- Payment.
- Merchandise amount.
- Explicit shipping amount.
- Total amount.
- Currency + minor-unit scale.
- Preparation actor/time.
- Provider-neutral success reference fields.

Browser roles have no direct table access.

## Payment summary extension

Order and private Payment summary values now support:

```text
pending
paid
partially_refunded
refunded
cancelled
```

A full merchandise return does not automatically imply the whole Payment is `refunded` if original shipping was retained. `refunded` is reached only when cumulative successful customer refund equals the trusted Payment amount.

## Partial quantity allocation

M4.2 uses cumulative proportional allocation rather than naive per-unit multiplication.

Conceptually, for a historical component `T`, purchased quantity `Q`, prior refunded quantity `P`, and current refund quantity `R`:

```text
current allocation
=
round(T × (P + R) / Q)
-
round(T × P / Q)
```

This makes split partial refunds reconcile exactly to the historical total after currency rounding.

The same pattern is used for:

- Customer merchandise refund.
- IRTH subsidy reversal.
- Commission reversal.

## Settlement ledger reversals

On trusted Refund success, M4.2 appends per-Order-Item entries:

```text
refund_merchandise_reversal   negative
refund_irth_subsidy_reversal  negative
refund_commission_reversal    positive
```

The net effect reverses the Artisan entitlement associated with the refunded quantity without deleting or rewriting original sale entries.

The original sale ledger remains immutable.

## IRTH-funded discount treatment

A rollback-only test simulated an IRTH-funded subsidy and verified:

```text
Customer merchandise refund      315.00
IRTH subsidy reversal              30.00
Commission reversal                51.75
Artisan entitlement reversal      293.25
```

This confirms that the customer receives the historical customer-paid merchandise amount while IRTH subsidy and Commission economics are reversed separately.

## Shipping Refund

Default:

```text
shipping refund = 0
```

An explicit Super Admin-controlled exception may provide a shipping refund amount.

The database rejects cumulative shipping refund above the historical Order shipping fee.

No broader policy for when shipping should be refunded has been invented.

## Inventory restoration

Inventory restoration happens only after:

```text
Return approved
→ physical goods received
→ inspection
→ restockable quantity recorded
→ trusted Refund success
```

Only finite-stock, non-Made-to-Order products with an existing numeric inventory quantity are incremented.

The exact restored quantity is recorded on the Return Item to prevent duplicate restoration.

## Trusted boundaries

### Prepare Refund

```text
public.prepare_return_refund(...)
```

- Requires Super Admin at the trusted PostgreSQL boundary.
- Requires Return status `inspected`.
- Requires collected Payment: `paid` or already `partially_refunded`.
- Calculates trusted refund snapshots.
- Moves Return to `refund_pending`.
- Emits Return + Payment audit events.

### Record Refund success

```text
public.record_return_refund_succeeded(...)
```

- `service_role` only.
- Browser roles cannot execute it.
- Idempotent if the Refund already succeeded.
- Rejects cumulative Refund above Payment amount.
- Appends settlement reversals.
- Restores inspected/restockable finite inventory exactly once.
- Updates private Payment + Order payment summaries.
- Records provider-neutral Payment/Return audit events.

Future Payment Gateway adapters will call this trusted boundary only after verified provider Refund success.

## Controlled tests

All financial mutation tests used rollback-safe transactions. No test Refund or financial reversal remains in live data.

### Split Partial + Full reconciliation ✅

Temporarily simulated a quantity-3 sale from a historical 315.00 merchandise amount.

Observed:

```text
Refund 1 merchandise       105.00
Refund 2 merchandise       210.00
Total merchandise          315.00
Shipping explicit refund   150.00
Total customer refund      465.00
Original commission         47.25
Commission reversed         47.25
Payment status             refunded
Order payment status       refunded
Restocked quantity         2
```

All original sale components reconciled exactly.

### Idempotency + over-refund ✅

Verified:

```text
first success call changed   = true
second identical call        = false
ledger reversal rows         = 3
refund success events        = 1
shipping > historical fee    = blocked
```

### Security abuse tests ✅

Authenticated non-admin Customer was blocked from:

- Admin Return review.
- Refund preparation.
- Creating a Return for a Guest Order not owned by that Customer.

### Test leakage ✅

Post-rollback live state verified:

```text
Return Requests             0
Refunds                     0
Refund ledger rows          0
Refund success events       0
Controlled Order payment    pending (original state)
Controlled Product stock    2 (original state)
```

## Permissions verified

```text
record_return_refund_succeeded
  anon          false
  authenticated false
  service_role  true

prepare_return_refund
  authenticated true
  internal function enforces Super Admin

private.refunds
  authenticated SELECT false
  service_role SELECT     true
```

## Security Advisor

No direct Refund-table exposure was introduced.

The advisor reports authenticated-executable `SECURITY DEFINER` warnings for guarded Return/Admin RPCs. These RPCs use fixed empty `search_path` and enforce ownership/Super-Admin authorization inside PostgreSQL; explicit abuse tests passed. They should be reviewed again when Return UI/API is implemented to decide whether moving more of the public boundary behind Next.js server-only routes gives a cleaner production surface.

Known pre-existing warnings remain as tracked in project status.

Remediation reference:

https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

## Result

```text
M4.1 Return Workflow Foundation      ✅ CLOSED
M4.2 Refund Money Logic              ✅ CLOSED
```

The provider-independent Returns / Refunds backend foundation required by Phase 6 Money is now complete enough to proceed to M5 Payout Eligibility without selecting a Payment Gateway.

## Next

```text
M5 — Payout Eligibility Foundation
```

M5 must reuse the approved configurable Return Hold rule and fail closed while the exact Return window duration remains unapproved/unconfigured.

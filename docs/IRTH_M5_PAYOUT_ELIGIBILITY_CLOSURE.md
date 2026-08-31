# IRTH M5 — Payout Eligibility Foundation Closure

**Date:** 31 August 2026  
**Status:** CLOSED ✅

## Approved Eligibility Start Rule

For IRTH's internally split Order model, payout eligibility starts from each Artisan Group's own Shipment delivery time:

```text
Artisan Shipment delivered_at
→ configured Return Hold ends
→ Payment collected
→ no unresolved Return / Refund for the Order Item
→ positive current settlement balance
→ Eligible
```

The unified Customer Order does not have to wait for unrelated Artisan Shipments before this Artisan's hold starts.

## Return Hold Configuration

Added:

```text
markets.payout_return_hold_days
```

The exact duration remains intentionally `NULL` because no final duration has been approved.

Missing configuration fails closed:

```text
eligibility_status = configuration_missing
eligible_at = NULL
```

No current Market has a configured value at closure.

## Return Window Safety

Once a Return Hold duration is configured, a new Return Item cannot be opened after that Order Item's own Artisan Shipment delivery time + configured hold.

This prevents a financial race where an Item could become payout-eligible and then receive a newly opened Return after the same return period has ended.

While the duration remains unconfigured, Returns remain available and Payout eligibility remains fail-closed.

## Dynamic Eligibility Source of Truth

Created private security-invoker view:

```text
private.artisan_payout_eligibility
```

Eligibility is calculated from current trusted state rather than stored as a mutable boolean, combining:

- Order Item / Artisan Group.
- Shipment `delivered_at`.
- Market Return Hold configuration.
- private Payment status.
- unresolved Return state.
- current append-only Settlement Ledger balance.

Current statuses:

```text
configuration_missing
not_delivered
payment_not_collected
return_open
hold_active
no_positive_balance
eligible
```

## Settlement Amount

`current_settlement_amount` is the sum of the append-only Artisan Settlement Ledger for the Order Item.

This means successful Refund reversal entries automatically reduce future payout eligibility without rewriting historical sale entries.

## Trusted Read Boundary

Added server-only RPC:

```text
public.get_payout_eligibility_for_admin(p_artisan_id uuid default null)
```

Permissions verified:

```text
anon          EXECUTE false
authenticated EXECUTE false
service_role  EXECUTE true
```

Direct authenticated SELECT on the private eligibility view is denied.

## Controlled Rollback Tests

Using an existing delivered Order, with a temporary 2-day hold and temporary Payment states inside `BEGIN ... ROLLBACK`, verified:

```text
hold elapsed + payment pending    → payment_not_collected
payment paid + hold active        → hold_active
unresolved Return after hold      → return_open
Return resolved/rejected          → eligible
```

Final eligible test state during the transaction:

```text
return_hold_days       = 2
current settlement     = 267.75 EGP
payment_status         = paid
unresolved Return      = false
eligibility_status     = eligible
eligible_at            = Shipment delivered_at + 2 days
```

Also verified that creating a new Return after the configured window closes is rejected with:

```text
return_window_closed
```

All test changes were rolled back.

Post-test live state confirms:

```text
configured Markets = 0
```

No Return Hold value was invented or persisted.

## Security Advisor

M5 introduced no new payout-specific Security Advisor warning.

Known existing notices remain, including RLS-no-policy informational notices, guarded Return RPC SECURITY DEFINER warnings, the legacy market-price review warning, and Leaked Password Protection disabled.

## Migration

```text
20260831173411_create_payout_eligibility_foundation
```

## Next

```text
M6 — Payout Accounts + Manual Super Admin Bank Transfer Batches
```

M6 must consume only currently eligible positive balances and must prevent the same eligible amount from being paid twice.

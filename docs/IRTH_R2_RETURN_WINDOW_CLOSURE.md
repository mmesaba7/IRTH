# IRTH R2 — Dynamic Return Window Closure

**Date:** 31 August 2026  
**Stage:** Pre-Live MVP testing  
**Status:** CLOSED ✅

## Approved rule

- Initial Return Window = **14 days**.
- Super Admin can change the active value.
- The active value is snapshotted onto each Shipment when that Shipment is delivered.
- Later configuration changes are **not retroactive** for already-delivered Shipments.
- Return-window changes are audited.
- Payout eligibility uses the Shipment snapshot, not the current mutable Market setting.

## Runtime verification completed

### Live baseline

Egypt Market:

```text
payout_return_hold_days = 14
```

Delivered Shipment for order `IRTH-20260830-782EBA88`:

```text
return_window_days_snapshot = 14
return_window_ends_at = delivered_at + 14 days
```

### Non-retroactive E2E test

The trusted Super Admin configuration function was used in Pre-Live testing to change:

```text
14 → 30
```

While the Market setting was 30, the already-delivered Shipment remained:

```text
return_window_days_snapshot = 14
```

and its historical `return_window_ends_at` did not change.

The setting was then restored through the same trusted function:

```text
30 → 14
```

Final live Market configuration is therefore again 14 days.

### Audit trail

`private.market_return_window_history` recorded both test transitions with explicit reasons:

```text
14 → 30  Pre-live E2E test
30 → 14  Pre-live E2E restore
```

### Validation / authorization

Verified:

- Negative duration is rejected with `invalid_return_window_days`.
- A non-Super-Admin identity is rejected with `admin_required`.
- The exposed mutation RPC is service-boundary controlled rather than a browser-authoritative setting.

### Payout reconciliation

`private.artisan_payout_eligibility` reports the delivered Order Item using:

```text
return_hold_days = 14
hold_ends_at = Shipment return_window_ends_at
```

This confirms payout hold logic consumes the immutable Shipment snapshot rather than the current Market Return Window value.

## Result

R2 Dynamic Return Window is considered closed for the current Pre-Live MVP stage.

The business decision is now represented by running database behavior, not only UI/configuration text:

```text
Super Admin active configuration
→ Shipment delivered
→ active duration snapshotted
→ historical Shipment rights remain unchanged
→ Return / Payout logic reads Shipment snapshot
```

Remaining Return-policy decisions are separate and still unresolved unless explicitly approved later, including return-shipping cost responsibility, exclusions, and Custom / Made-to-Order return policy.

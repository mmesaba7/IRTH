# IRTH M2 — Provider-Independent Payment Core Closure

**Date:** 31 August 2026  
**Status:** CLOSED ✅

## Scope

M2 builds the provider-independent Payment Domain required before choosing the first Online Payment Gateway.

No gateway was selected in M2.

## Closed sub-milestones

```text
M2.1 Payment Database + Audit Foundation                 ✅
M2.2 Order + Payment Method Wiring                       ✅
M2.3 Trusted Payment Transitions + Fulfillment Gates     ✅
     + Safe Online Expiry Cancellation / Stock Restore   ✅
```

## Approved decision coverage

### P1 — Dedicated Payment Domain ✅

Implemented:

```text
private.payments
private.payment_attempts
private.payment_events
```

`orders.payment_status` remains a summary, not the Payment source of truth.

### P2 — Order Payment summary semantics ✅

Current Order-level summary values:

```text
pending
paid
cancelled
```

Attempt-level values support:

```text
created
pending
succeeded
failed
expired
cancelled
```

A failed Online attempt does not automatically mean the whole Order is failed.

Refund summaries remain for M4:

```text
partially_refunded
refunded
```

### P3 — Historical Payment Method ✅

New Orders explicitly store:

```text
online
cod
```

Legacy Orders created before this foundation remain method-unknown instead of being guessed.

### P4 — Fulfillment gating ✅

Online:

```text
Order received + payment pending
→ Artisan fulfillment blocked
→ trusted payment success
→ payment paid + Order confirmed
→ fulfillment allowed
```

COD:

```text
Order received + COD pending
→ Artisan fulfillment blocked
→ IRTH / Super Admin confirms Order
→ fulfillment allowed
```

These gates are enforced at the trusted PostgreSQL boundary, not only in UI.

### P5 — Online expiry cancellation + finite-stock restoration ✅

New non-Made-to-Order Order Items record exact inventory reservations in:

```text
private.order_inventory_reservations
```

Trusted expiry cancellation atomically:

```text
restore recorded stock
→ release reservation
→ Payment cancelled
→ Order payment summary cancelled
→ Order cancelled
→ audit events/history
```

No timeout duration was invented. M3 must use an approved IRTH timeout or the selected provider's appropriate expiry semantics.

### P6 — Trusted COD collection ✅

Manual MVP boundary exists for Super Admin after delivery:

```text
Delivered COD Order
→ Super Admin records collection
→ Payment paid
```

Courier automation remains Architecture Later.

### P7 — Refused / delivery-failed COD does not immediately restore stock ✅

No automatic inventory restoration is connected to `delivery_failed`.

Physical return / restockability must be confirmed through the Return / Refusal domain before stock is restored.

### P8 — Provider callback security boundary READY FOR M3 🟨

M2 establishes server-only trusted Payment mutation boundaries and append-only/idempotent event infrastructure.

Provider-specific callback requirements still belong to M3 because they depend on the gateway selected by the owner:

```text
verify provider signature
verify Order / amount / currency
provider event idempotency
record Payment Attempt / Event
apply trusted Payment transition
```

A browser success redirect is never proof of payment.

## Security verification

Browser roles cannot directly declare Online Payment success or expire/cancel Online Orders.

Verified:

```text
record_online_payment_succeeded
  anon          false
  authenticated false
  service_role  true

cancel_expired_online_order
  anon          false
  authenticated false
  service_role  true
```

Payment and inventory-reservation data remain private.

Security Advisor showed no new Payment-Core-specific warning.

Known pre-existing project security debt remains unchanged:

1. legacy authenticated-executable SECURITY DEFINER market-price review function;
2. Supabase Auth leaked-password protection disabled.

## Controlled transaction tests

Verified with rollback-safe tests:

- COD fulfillment rejected before IRTH confirmation.
- COD fulfillment accepted after IRTH confirmation.
- Online success synchronizes Payment + Order and emits exactly one success event/history transition.
- Online expiry restores the exact reservation quantity and cancels Payment + Order atomically.
- Real test Order / Product state remained unchanged after rollback.

## M2 result

The provider-independent Payment Core is now complete enough to integrate one real Online Payment Gateway without rebuilding Checkout, Order, inventory, fulfillment, or Payment history architecture.

## Next

```text
M3 — First Online Payment Provider
```

M3 must start with a current official provider comparison. The owner must choose the first gateway before adapter implementation.

No gateway choice is made by this closure document.

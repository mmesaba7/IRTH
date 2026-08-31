# IRTH M2.3 — Payment Transitions, Fulfillment Gate & Online Cancellation Closure

**Date:** 31 August 2026  
**Status:** CLOSED ✅

## Scope

M2.3 implements the already-approved provider-independent Payment Core rules P4, P5 and P6 without selecting or integrating a real Online Payment Gateway.

It does not define a payment expiry duration. That remains intentionally unresolved until M3 provider integration / explicit timeout approval.

## Implemented database migrations

```text
supabase/migrations/20260831160358_harden_payment_fulfillment_and_online_cancellation.sql
supabase/migrations/20260831160528_fix_online_cancellation_order_id_ambiguity.sql
```

## 1. Durable inventory reservation snapshot

Created private table:

```text
private.order_inventory_reservations
```

For every new Order created through the approved atomic Order + Payment transaction, each non-Made-to-Order Order Item records the exact quantity that was decremented from inventory.

This prevents future cancellation/restoration logic from guessing from the Product's later inventory mode or quantity.

Legacy Orders are not guessed/backfilled.

Browser roles have no direct access. `service_role` has read-only access for trusted server operations.

## 2. COD fulfillment gate

The trusted Artisan fulfillment function now enforces:

```text
COD Order created
→ payment = pending
→ order = received
→ Artisan cannot start preparing
→ IRTH / Super Admin confirms Order
→ order = confirmed
→ Artisan may prepare
```

The gate is enforced in PostgreSQL, not only in UI.

## 3. Online fulfillment gate

For Online Payment:

```text
Online Order created
→ payment = pending
→ order = received
→ Artisan cannot prepare
→ trusted payment success
→ payment = paid
→ order = confirmed
→ Artisan may prepare
```

An unpaid Online Order cannot be manually confirmed by IRTH.

## 4. Trusted Online payment-success transition

Added server/provider-only boundary:

```text
public.record_online_payment_succeeded(...)
```

Only `service_role` can execute the public boundary.

A successful transition atomically:

- validates Payment method = `online`;
- requires Payment = `pending` and Order = `received`;
- changes Payment summary to `paid`;
- synchronizes `orders.payment_status = paid`;
- changes Order to `confirmed`;
- records append-only `payment_succeeded` event;
- records Order status history with source `online_payment_success`.

Browser `anon` and `authenticated` roles cannot declare Online Payment success.

## 5. Safe Online expiry cancellation

Added server-only boundary:

```text
public.cancel_expired_online_order(...)
```

Only `service_role` can execute it.

It requires:

```text
method = online
payment = pending
order = received
```

Then atomically:

```text
restore recorded finite stock reservations
→ release reservation snapshots
→ Payment = cancelled
→ orders.payment_status = cancelled
→ Order = cancelled
→ payment_expired_order_cancelled event
→ Order status history
```

The function does not contain or invent an expiry duration. A trusted M3 provider/worker will decide when to invoke it according to the future approved/provider timeout.

## 6. Manual COD collection boundary

Added:

```text
public.record_admin_cod_collected(order_id)
```

MVP rule:

```text
COD
→ confirmed
→ fulfillment / shipping
→ delivered
→ Super Admin records collection
→ Payment = paid
```

The function requires Super Admin authorization, `method = cod`, Payment = `pending`, and Order = `delivered`.

Courier automation remains Architecture Later.

## 7. Controlled verification

All mutation tests were performed inside transactions followed by `ROLLBACK` so production Order / stock state was preserved.

Verified COD gate:

```text
received COD
→ Artisan preparing rejected
→ Super Admin confirmation
→ Artisan preparing accepted
```

Verified Online payment success:

```text
Payment pending → paid
Order received → confirmed
payment_succeeded events = 1
online_payment_success history = 1
```

Verified Online expiry cancellation with finite-stock reservation:

```text
Product quantity during test: 2 → 3
Reservation released: true
release_reason: online_payment_expired
Payment: cancelled
Order: cancelled
expiry event count: 1
```

After rollback, the real controlled Order returned to:

```text
Order status: received
Payment method: cod
Payment status: pending
Product quantity: 2
Reservations added by test: 0
```

Verified execution privileges:

```text
record_online_payment_succeeded:
  anon          = false
  authenticated = false
  service_role  = true

cancel_expired_online_order:
  anon          = false
  authenticated = false
  service_role  = true

order_inventory_reservations SELECT:
  authenticated = false
  service_role  = true
```

Security Advisor reported no new Payment-Core-specific warning.

Known pre-existing security debt remains unchanged:

- legacy executable SECURITY DEFINER market-price review function;
- Supabase Auth leaked-password protection disabled.

## Result

**M2.3 is CLOSED ✅**

Provider-independent Payment Core now has:

```text
M2.1 Payment Database + Audit Foundation       ✅
M2.2 Order + Payment Method Wiring             ✅
M2.3 Trusted transitions / gates / cancellation ✅
```

The next step is a final short **M2 closure review**. If no missing provider-independent correctness issue remains, Phase 6 advances to **M3 — First Online Payment Provider selection + adapter integration**.

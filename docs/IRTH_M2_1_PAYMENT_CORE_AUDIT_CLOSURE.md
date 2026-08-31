# IRTH — M2.1 Payment Core Audit Foundation Closure

**Date:** 31 August 2026  
**Status:** CLOSED ✅  
**Scope:** Phase 6 — M2 Payment Core

## Goal

Create the smallest provider-independent Payment database and audit foundation without integrating a real Payment Gateway, Refund engine, Payout execution or Bank Transfer details.

## Migration

```text
supabase/migrations/20260831153844_create_payment_core_audit_foundation.sql
```

## Implemented

### 1. Order Payment Summary Constraint

`public.orders.payment_status` remains a summary field and is constrained in M2 to:

```text
pending
paid
cancelled
```

`failed` and `expired` belong to individual Online Payment Attempts rather than the Order payment summary.

Refund states remain deferred to the Refund-owning module in M4.

### 2. Private Payment Domain

Created:

```text
private.payments
private.payment_attempts
private.payment_events
```

`private.payments` stores one provider-independent Payment summary per Order.

`private.payment_attempts` supports multiple Online Payment attempts per Payment and separates attempt lifecycle from Order summary lifecycle.

Initial attempt states:

```text
created
pending
succeeded
failed
expired
cancelled
```

`private.payment_events` is the append-only audit history for trusted Payment events.

### 3. Historical Payment Method

Payment method supports:

```text
online
cod
```

The two existing Orders were created before Payment Core existed, so their historical method is intentionally `NULL` rather than guessed.

Payment method becomes required for new Checkout wiring in M2.2.

### 4. Provider-Independent Fields

No first Online Payment Gateway is selected or hard-coded in M2.1.

The schema supports generic provider references and provider event IDs for future M3 integration.

Raw provider webhook payloads are not stored by this foundation.

### 5. Idempotency / Deduplication Foundations

- One Payment per Order.
- Unique Online attempt number per Payment.
- Unique provider attempt reference when present.
- Unique Payment Event `source_key`.
- Unique provider event ID per provider when present.

These constraints support future safe callback deduplication.

### 6. Audit Immutability

`private.payment_events` is append-only.

UPDATE / DELETE attempts are rejected by a database trigger. Corrections must be represented by new events rather than rewriting financial/payment history.

### 7. Security Boundary

Browser roles:

```text
anon          -> no direct Payment table access
authenticated -> no direct Payment table access
```

`service_role` currently has read-only direct table access for internal server inspection but no direct INSERT grants.

Future writes must go through narrow trusted Payment functions / boundaries introduced by the owning M2 tasks.

## Existing Order Backfill

Live state at closure:

```text
Orders:                  2
Payment records:         2
Payment attempts:        0
Payment audit events:    2
Legacy unknown methods:  2
Matching Order summaries: 2 / 2
```

Each pre-M2 Order received a Payment summary using its trusted Order amount, currency, currency scale and payment status.

Each backfilled Payment received an append-only `payment_core_backfill` event.

No historical Payment Method was invented.

## Verification

Verified:

- Order count equals Payment count.
- Payment amount / currency / status snapshots match the existing Orders.
- Browser roles cannot directly read Payment tables.
- `service_role` cannot directly insert Payment records or events.
- Append-only UPDATE protection rejects mutation.
- `orders.payment_status` constraint is active.
- Migration is present in Live Supabase migration history.
- GitHub contains the matching migration file.

## Security Advisor

Final Supabase Security Advisor showed no new M2.1-specific security warning.

Pre-existing notices remain separate technical debt:

- Legacy authenticated-executable `SECURITY DEFINER` warning for `public.review_product_market_price_request(...)`.
- Supabase Leaked Password Protection is disabled.
- Existing intentional RLS-with-no-direct-policy informational notices for protected tables.

## Explicitly Not Implemented in M2.1

- Real Payment Gateway.
- Checkout Payment Method selection/wiring.
- Payment success callback processing.
- Manual COD collection action.
- Online payment expiry timer.
- Unpaid Order cancellation / stock restoration.
- Refund execution.
- Payout execution.
- Bank Transfer payout account storage.

## Next Task

```text
M2.2 — Order / Checkout Payment Method Wiring
```

M2.2 must ensure every newly created Order has an explicit trusted Payment Method (`online` or `cod`) and an atomic Payment record created with the Order, while preserving the independent Payment Domain.

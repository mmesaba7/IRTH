# IRTH M2.2 — Order + Payment Method Wiring

**Date:** 31 August 2026  
**Status:** IMPLEMENTED — local application build/browser verification still required before formal closure

## Scope

M2.2 wires the approved Payment Core into real Order creation without selecting or integrating an Online Payment Gateway.

Implemented boundaries:

- Checkout sends an explicit Payment Method.
- Server accepts only `cod` or `online`.
- New Order + Payment creation uses one outer PostgreSQL transaction.
- Payment record and `payment_initialized` audit event are created atomically with the Order transaction.
- Existing Order idempotency remains authoritative.
- A retry cannot silently change the original Payment Method.
- Legacy Orders whose historical Payment Method is unknown remain unknown and cannot be silently assigned a method by an idempotent replay.
- Browser roles cannot execute the trusted Order+Payment RPC directly.
- Online Payment remains disabled in the Checkout UI until M3 chooses and integrates the first Gateway.
- COD is the only customer-selectable Payment Method in the current UI.

## Database migrations

```text
supabase/migrations/20260831154835_wire_order_payment_method_transaction.sql
supabase/migrations/20260831155232_fix_order_payment_transaction_ambiguity.sql
```

The second migration fixes an ambiguity discovered during controlled verification where PostgreSQL could interpret `order_id` as either a function output variable or a table column. The failed test did not mutate Order or Payment data.

## Trusted transaction boundary

```text
Next.js /api/orders
    ↓ trusted server validation
public.create_order_with_payment_transaction (SECURITY INVOKER wrapper)
    ↓
private.create_order_with_payment_transaction (SECURITY DEFINER, service_role only)
    ↓
public.create_order_transaction
    ↓
Order + items + inventory + settlement ledger
    ↓
Payment summary + payment_initialized audit event
```

All operations execute inside the same PostgreSQL transaction. A failure in Payment initialization rolls back the Order transaction as well.

## Checkout behavior

Current customer UI:

```text
Cash on delivery      ✅ selectable
Online payment        ⛔ disabled until M3
```

This prevents an unpaid Online Order from being created before a Gateway/attempt/expiry path exists.

## Verification completed

Live database state remained unchanged during controlled legacy replay testing:

```text
Orders:                 2
Payments:               2
Legacy method:          remains NULL
New initialized events: 0
```

The controlled replay correctly raised:

```text
payment_method_unknown_for_reused_order
```

and did not rewrite historical Payment Method data.

RPC permissions verified:

```text
service_role public wrapper EXECUTE: true
authenticated wrapper EXECUTE:       false
anon wrapper EXECUTE:                false
service_role private function:       true
```

Security Advisor showed no new Payment-specific warning. Pre-existing project warnings remain unchanged:

1. Legacy authenticated-executable `review_product_market_price_request(...)` SECURITY DEFINER function.
2. Supabase Auth Leaked Password Protection disabled.

## Application verification still required

Because M2.2 changes Next.js application code, formal closure requires local verification after pulling:

```text
npm.cmd run build
```

Then browser verification should confirm:

1. Checkout renders Cash on Delivery as selected.
2. Online Payment is visible but disabled.
3. A real test Order can be placed successfully.
4. The resulting Payment record has `method = 'cod'`, `status = 'pending'`, and matches the Order total/currency.
5. Exactly one `payment_initialized` event exists for the new Order.
6. Repeating the same request does not duplicate the Order or Payment event.

Do not mark M2.2 CLOSED until build + browser E2E verification passes.

## Next after closure

After M2.2 closes, M2 continues with trusted Payment lifecycle work needed before M3, including COD trusted collection transitions and the Online attempt/expiry/stock-restoration path. The first actual Online Payment Gateway remains an M3 decision.

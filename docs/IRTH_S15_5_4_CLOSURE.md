# IRTH S15.5.4 — Order Creation Transactional Design Closure

**Status:** CLOSED ✅  
**Closure date:** 31 August 2026

This closure record supplements `IRTH MVP Specification v0.1` and `docs/IRTH_S15_5_DECISION_REGISTER.md`. The Specification remains authoritative for Product and Architecture decisions.

## Approved implementation boundary

S15.5.4 implements secure real Order creation without integrating a Payment Gateway, Courier API, payout execution, advanced refund engine, multi-address checkout, analytics, or Custom Orders.

## Implemented

- Real `orders`, `order_customer_details`, `order_artisan_groups`, `order_items`, `shipments`, and `order_status_history` foundations.
- Historical Order Item, pricing, Promotion, Coupon, shipping, and commission-rate snapshots.
- Private customer/contact/address snapshot.
- One unified customer Order with internal Artisan Groups.
- Separate Order status and Payment status.
- Initial status `received`; initial payment status `pending`.
- Atomic database Order transaction.
- Mandatory server-side trusted re-quote before write.
- Browser submits intent only; trusted monetary values are server-derived.
- Mandatory idempotency key.
- Guest/Auth-compatible Order model.
- Atomic finite-stock revalidation/decrement; Made-to-Order does not use finite-stock decrement.
- Coupon Redemption occurs only inside the secure Order transaction.
- Commission-rate snapshot resolves Artisan override first, then Craft default.
- One Order-level Shipping fee.
- Status History starts at Order creation.
- Browser → Next.js server route → server-only privileged Supabase client → narrow `SECURITY INVOKER` RPC.
- Checkout `Place Order` is wired to the real `/api/orders` endpoint.
- Secure Order Success page displays non-sensitive Order state only.

## Security fix discovered during browser E2E

The first browser Order attempt reached the database but failed with:

```text
permission denied for table orders
```

Root cause: `public.create_order_transaction(...)` correctly uses `SECURITY INVOKER`, but `service_role` did not yet have the table-level DML privileges needed by the transaction.

Approved fix: preserve `SECURITY INVOKER` and grant `service_role` only the minimum table privileges required by the transaction. No new browser (`anon` / `authenticated`) write privilege was introduced.

Live migration:

```text
20260830231111_grant_service_role_order_transaction_privileges
```

Git migration:

```text
supabase/migrations/20260830231111_grant_service_role_order_transaction_privileges.sql
```

## Verification

### Production build

After the Checkout and Order Success wiring:

```text
next build
Compiled successfully
TypeScript passed
53/53 static pages generated
```

### Database transaction E2E

Earlier direct database E2E verified:

- Atomic creation.
- Same idempotency scope/key returns the same Order.
- Finite stock decrements once.
- Order / Artisan Group / Item / History snapshots are created together.
- Commission rate snapshot = `15.00`.
- Test data was cleaned and stock restored after the direct DB test.

### Browser E2E

Browser Order created successfully:

```text
Order Number: IRTH-20260830-782EBA88
Status: received
Payment Status: pending
Currency: EGP
```

Trusted monetary verification:

```text
Merchandise before Promotions: 350.00 EGP
Promotion discount:            35.00 EGP
Coupon discount:                0.00 EGP
Merchandise subtotal:          315.00 EGP
Shipping:                      150.00 EGP
Final total:                   465.00 EGP
```

Order structure verification:

- Artisan Group count = 1.
- Customer Details snapshot exists = 1.
- `received` Status History entry count = 1.
- Order Item snapshot product = `clay-vessel` / `Clay Vessel`.
- Quantity = 1.
- Unit price = 350.00 EGP.
- Line total = 315.00 EGP.
- Commission rate snapshot = 15.00%.
- Product is finite-stock and current stock = 4 after the browser purchase (previous verified stock = 5).
- Matching Order count for the exact idempotency scope/key = 1; no duplicate Order was created.

Sensitive customer PII was intentionally not copied into this closure document.

## Closure result

**S15.5.4 — Order Creation Transactional Design is CLOSED ✅.**

Payment collection remains separate and `payment_status = pending` is correct until the Payment Layer is integrated.

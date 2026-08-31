# IRTH — M2 Payment Core Decision Register

**Date:** 31 August 2026  
**Status:** APPROVED  
**Scope:** Phase 6 — M2 Payment Core

This register records the owner-approved provider-independent Payment Core decisions. It supplements the IRTH MVP Specification v0.1 and the Phase 6 Money Decision Register.

## P1 — Dedicated Payment Domain

Use a dedicated Payment Domain with Payment records, Online Payment Attempts and append-only Payment Events. `orders.payment_status` remains a summary only.

Classification: 🟢 MVP.

## P2 — Order Payment Summary States

Current M2 summary states:

- `pending`
- `paid`
- `cancelled`

`failed` and `expired` are Payment Attempt states rather than terminal Order payment summary states because an Online Payment may be retried successfully.

Refund summary states are introduced with the Refund-owning module in M4 rather than being implemented prematurely in M2.

Classification: 🟢 MVP.

## P3 — Historical Payment Method

Orders must have an explicit historical Payment Method when the Checkout wiring is implemented:

- `online`
- `cod`

Payment Method must not be inferred from Payment Status.

Existing Orders created before Payment Core do not have a trustworthy method snapshot; their method remains unknown rather than being guessed.

Classification: 🟢 MVP.

## P4 — Online Payment Blocks Fulfillment Until Paid

For Online Payment, Artisan fulfillment must not start while Payment is still pending. Fulfillment becomes available only after trusted successful payment.

COD remains operationally different: it may proceed through confirmed fulfillment while Payment remains pending collection.

Classification: 🟢 MVP.

## P5 — Failed / Expired Online Payment and Stock

If the Online Payment window ends without a successful payment, the unpaid Order must have a trusted cancellation path that restores finite stock atomically where applicable.

No payment expiry duration is invented in M2. The eventual provider expiry or an explicitly approved IRTH timeout will be selected at M3 if required.

Classification: 🟢 MVP correctness.

## P6 — COD Collection

MVP starts with trusted manual IRTH / Super Admin COD collection confirmation. The Customer, Artisan and Browser cannot mark COD as paid.

Courier-driven automatic collection confirmation is deferred until a real Courier integration exists.

Classification:

- Manual trusted COD confirmation: 🟢 MVP.
- Courier automation: 🟡 Architecture Later.

## P7 — COD Refusal / Delivery Failure and Inventory

Do not restore inventory automatically merely because a Shipment is `delivery_failed` or refused. Physical return / restockability must be confirmed before inventory is restored.

Classification: 🟢 MVP safety.

## P8 — Provider Callback Security

Online Payment success must be trusted only after server-side verification of the provider callback / webhook or provider-side verification.

Required boundary:

- Verify provider signature/authenticity.
- Verify Order / amount / currency.
- Apply idempotency / deduplication.
- Record append-only Payment Event history.
- Update the Payment summary only from trusted server/database code.

A browser redirect to a success page is never proof that payment succeeded.

Classification: 🟢 MVP security.

## Approved M2 Implementation Sequence

```text
M2.1 Payment Database + Audit Foundation
↓
M2.2 Order / Checkout Payment Method Wiring
↓
M2.3 Trusted Payment Transitions + COD Manual Confirmation
↓
M2.4 Online Pending / Expiry Cancellation + Stock Restoration
↓
M2.5 Payment Notifications / Read Boundaries
↓
M3 First Online Payment Provider
```

M2.1 must not integrate a real Payment Gateway, execute Refunds, execute Payouts, or collect Bank Transfer details.

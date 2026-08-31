# IRTH M3.0 — Payment Gateway Compatibility Checkpoint

**Date:** 31 August 2026  
**Status:** CLOSED ✅

## Why this checkpoint exists

The IRTH MVP Specification requires the Payment Layer to remain independent from Checkout and not be tied to one gateway. The current project also intentionally defers the first real gateway choice.

This checkpoint verifies that IRTH can later support providers such as Stripe, Paymob, FAB/bank gateways, or other market-specific providers without rebuilding Order, Checkout, Payment Core, inventory, or Return/Refund business logic.

## Decision

Do not integrate or select a real gateway now.

Keep the current provider-independent Payment Core and add one narrow server-only adapter contract for future gateway implementations.

Classification:

- 🟢 MVP: provider-independent Payment Core — already implemented.
- 🟡 Architecture Later: multiple provider adapters behind the same contract.
- 🔵 Provider-specific integrations: deferred until a provider/market is actually selected.

## Implemented adapter boundary

File:

```text
src/lib/payments/providerAdapter.ts
```

Provider implementations must satisfy the same contract for:

```text
createPaymentSession()
verifyWebhook()
refundPayment()
```

The contract also normalizes provider event status into IRTH-understood attempt states.

## Required architecture

```text
Checkout / Order
      ↓
IRTH Payment Core
      ↓
Payment Provider Adapter
      ↓
Stripe / Paymob / FAB / other provider
```

Provider-specific SDK/API code must not be called directly from Order, Checkout, Return, Refund, Settlement, or Payout business logic.

## Security rules

- Adapter implementations are server-only.
- Browser success redirects are never proof of payment.
- Each provider adapter must verify its own webhook authenticity/signature before producing a trusted provider event.
- Order/amount/currency checks and idempotent Payment Events remain inside IRTH trusted server/database boundaries.
- Provider secrets must remain server-side and must never be sent to the browser or logs.

## Existing Payment Core compatibility

The current DB already supports provider-neutral integration through:

```text
private.payments
private.payment_attempts
private.payment_events
```

`payment_attempts` already stores provider code/reference and multiple attempts per Payment.

`payment_events` already supports provider code/event id and idempotent provider event history.

Therefore no Database migration is required for this compatibility checkpoint.

## Refund compatibility

M4 Returns / Refunds must request a refund through the Payment Provider Adapter associated with the original successful payment attempt.

M4 must not contain Stripe-, Paymob-, FAB-, or bank-specific refund logic.

The exact provider refund API, capabilities, timing, and partial-refund rules remain provider-specific and will be implemented only when that provider is selected.

## What was intentionally NOT built

- No Stripe integration.
- No Paymob integration.
- No FAB/bank integration.
- No provider SDK dependency.
- No provider credentials/configuration.
- No fake webhook endpoints.
- No assumed gateway pricing, countries, currencies, expiry timing, or refund behavior.

## Result

IRTH is architecture-ready for one or multiple future Online Payment Gateway adapters without introducing provider coupling now.

Gateway selection/integration is deferred and is not a blocker for M4 Returns / Refunds.

## Next

```text
M4 — Returns / Refunds
```

M4 should build the provider-independent Return/Refund domain first and use the adapter boundary for future external refund execution.

# IRTH Project Status

**Project:** IRTH  
**Document Purpose:** Current implementation status of the IRTH MVP  
**Last Updated:** 31 August 2026  
**Current Position:** Phase 6 — M4 Returns / Refunds; M4.1 Return Foundation CLOSED, M4.2 Refund Money Logic next. Real Online Gateway selection/integration is intentionally deferred.

---

# 1. Source of Truth

Priority remains:

1. **IRTH MVP Specification v0.1** — source of truth for approved Product / Architecture decisions.
2. **IRTH_PROJECT_STATUS.md** — source of truth for actual implementation / test status.
3. **Git repository** — source of truth for application code and migration files.
4. **Live Supabase** — source of truth for currently running database state.

If this document conflicts with the Specification on a Product decision, the Specification wins unless the owner explicitly approves a change.

---

# 2. Core Architecture

Approved architecture:

```text
Next.js
+
TypeScript
+
Supabase / PostgreSQL
+
Modular Monolith
```

MVP does not use Microservices.

Core rule:

> Build simple, but build it correctly.

Payment, Shipping and Notification remain separate layers.

Future product direction already approved:

- Android application after the web Marketplace reaches the appropriate stage.
- iOS application after the web Marketplace reaches the appropriate stage.
- Current web/backend architecture should remain reusable by future mobile clients rather than being rebuilt from zero.

This is an **Architecture Later** direction, not an instruction to build mobile apps during the current MVP task.

---

# 3. Pre-Live Financial Testing Mode — OWNER APPROVED

IRTH is currently in a development/testing phase. Current local application use and controlled database tests are test activity; no real customer payment, refund, payout, or other real-money movement is intended at this stage.

Until the owner explicitly announces that IRTH is moving to a hosted/domain production launch with real financial operations:

- Payment, refund, return, settlement, payout, inventory, and related financial workflows should be tested aggressively enough to expose edge cases before launch.
- Prefer rollback-safe controlled tests for destructive or state-changing database verification where practical.
- Test data and simulated financial state must never be described as real money movement.
- No real Payment Gateway charge/refund or real Artisan bank transfer should be initiated merely for development testing.
- Existing security, authorization, privacy, auditability, idempotency, and server-authoritative financial rules remain mandatory during testing; development mode is not permission to weaken the architecture.
- Provider integrations may later use provider-supported sandbox/test modes when selected.

**Production safety switch:** when the owner explicitly says the project is going live on hosting/domain and real financial operations are about to begin, perform a dedicated Production Readiness / Money Safety Review before enabling real payment, refund, or payout execution. Re-check production secrets, provider live/test mode, webhook verification, idempotency, permissions, financial reconciliation, logging/PII exposure, operational controls, and rollback/recovery procedures.

This is an operational/testing decision. It does not replace the MVP Specification or change the approved business rules.

---

# 4. Overall MVP Progress

```text
Foundation                  ✅ Core implemented
Identity & Structure        🟨 Mostly implemented
Marketplace                 ✅ Core implemented
Shopping                    ✅ Trusted Checkout + real Order creation foundation
Orders                      ✅ Core + Fulfillment + Shipping + Tracking + Notifications foundation
Shipping                    🟨 Manual Shipment lifecycle + Tracking real; Courier API later
Tracking                    ✅ Customer + Guest + Admin Tracking CLOSED
Notifications               ✅ Notification Foundation v0.1 CLOSED
Money                       🟨 M1.1 Ledger + M2 Payment Core + M3.0 Gateway Compatibility CLOSED; real gateway deferred; M4 active
Returns / Refunds           🟨 M4.1 secure Return Foundation CLOSED; M4.2 Refund Money Logic next
Reviews                     🟨 Existing UI/foundation; verified-purchase integration still required
Testing & Final Polish      ⬜ Later
```

Current major position:

```text
Marketplace / Discovery         ✅
Secure Shopping                 ✅ core
Transactional Orders            ✅ core
Artisan Fulfillment             ✅ core
Admin Order Management          ✅ core
Shipping Status                 ✅ manual MVP foundation
Tracking Metadata               ✅ CLOSED
Customer / Guest Tracking       ✅ CLOSED
Notification Foundation         ✅ CLOSED
Money / Payment Core            ✅ CLOSED
M3.0 Gateway Compatibility      ✅ CLOSED
M3 Real Gateway Integration     ⏸️ DEFERRED by owner
M4.1 Return Foundation          ✅ CLOSED
M4.2 Refund Money Logic         ← NEXT
```

---

# 5. Phase 6 Money Status

## M1.1 — Commission Settlement Ledger Foundation — CLOSED ✅

Implemented:

- Market-level currency minor-unit scale; Egypt / EGP = 2.
- Private append-only Artisan settlement ledger.
- Historical sale, IRTH-funded subsidy, and commission entries per Order Item.
- Artisan-funded discounts reduce settlement / commission base.
- IRTH-funded discounts preserve Artisan economic entitlement.
- Browser roles have no direct ledger access.

Closure record:

```text
docs/IRTH_M1_1_SETTLEMENT_LEDGER_CLOSURE.md
```

## M2 — Provider-Independent Payment Core — CLOSED ✅

Implemented:

- Dedicated private Payment Domain.
- COD / Online payment-method history.
- Payment attempts + append-only events.
- Trusted payment transitions.
- Online fulfillment gate.
- Safe pending-online cancellation / finite-stock restoration path.
- Manual trusted COD collection boundary.
- Browser redirect is never proof of payment.

Closure record:

```text
docs/IRTH_M2_PAYMENT_CORE_CLOSURE.md
```

## M3.0 — Payment Gateway Compatibility Checkpoint — CLOSED ✅

Provider-independent adapter contract exists so future providers can integrate without rebuilding Orders / Checkout / Payment Core.

Potential future providers are not approved selections merely because they are technically possible. Real provider selection/integration is intentionally deferred by owner decision.

Checkpoint record:

```text
docs/IRTH_M3_0_PAYMENT_GATEWAY_COMPATIBILITY_CHECKPOINT.md
```

## M4.1 — Return / Refund Foundation — CLOSED ✅

Implemented:

- Private Return Request / Return Item / Return Event model.
- Order Item + Quantity return granularity.
- Authenticated customer ownership boundary.
- Server-only Guest Return boundary using opaque Guest credential verification.
- Super Admin approve/reject, receive, and inspect transitions.
- Restockable quantity captured at inspection.
- Append-only Return audit events.
- Controlled request → approve → receive → inspect rollback test passed.

Still intentionally unresolved and not invented:

- Return window duration.
- Return shipping-cost responsibility.
- Excluded return cases.
- Custom / Made-to-Order return policy.

Closure record:

```text
docs/IRTH_M4_1_RETURN_REFUND_FOUNDATION_CLOSURE.md
```

## M4.2 — Refund Money Logic — NEXT

Owner-approved MVP recommendation for implementation:

- Refund merchandise value for the approved returned quantity using trusted historical Order Item money snapshots and the actual customer merchandise amount after discounts.
- Shipping fee is **not automatically refunded**. Any shipping refund is an explicit IRTH-controlled exception until a broader policy is approved.
- Refund accounting must create append-only settlement reversals rather than rewriting historical sale entries.
- Commission and Artisan entitlement reversal must be proportional to the approved refunded quantity and preserve the distinction between IRTH-funded and Artisan-funded discounts.
- Refund execution remains provider-independent and the browser cannot declare refund success.

---

# 6. Payout

**Status: NOT IMPLEMENTED ⬜**

Approved sequence remains:

```text
Payment collected
↓
Delivery
↓
Configured Return hold ends
↓
No unresolved Return / Refund condition
↓
Eligible
↓
Manual Super Admin Payout Batch
↓
Bank Transfer
```

Approved MVP payout method: **Bank Transfer**.
Approved MVP payout execution model: **Manual Super Admin-controlled Payout Batches**.
Automated payout scheduling is deferred.

Return-hold duration is not yet approved and must not be invented.

---

# 7. Taxes / Withholdings

No automatic tax or withholding rule/rate is invented.

The append-only ledger is designed to support explicit auditable adjustments if a later approved legal/accounting rule requires them.

Before real production payouts, any legally required withholding/tax handling must be explicitly reviewed and approved.

---

# 8. Known Security Debt

Known pre-existing items remain tracked separately from current Money work:

- Legacy authenticated-executable SECURITY DEFINER function `public.review_product_market_price_request(...)`.
- Supabase Auth Leaked Password Protection disabled.
- Security Advisor INFO for RLS-enabled tables with no policies where access is intentionally controlled through narrow RPC boundaries must still be reviewed before production.

These are not to be silently ignored before production launch.

---

# 9. Immediate Next Task

```text
M4.2 — Refund Calculation + Payment/Ledger Settlement Reversal
```

After M4 Refund execution is correctly closed, continue the approved Money sequence toward Payout Eligibility and Payouts. Real Payment Gateway selection/integration remains deferred until the owner reopens it.

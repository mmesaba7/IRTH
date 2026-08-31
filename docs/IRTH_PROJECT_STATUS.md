# IRTH Project Status

**Project:** IRTH  
**Document Purpose:** Current implementation status of the IRTH MVP  
**Last Updated:** 31 August 2026  
**Current Position:** Phase 6 — M6 Payout Accounts + Manual Bank Transfer backend CLOSED; M7 Real Money UI + Money Notifications is next. Real Online Gateway selection/integration remains intentionally deferred.

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
Money                       🟨 M1.1 + M2 + M3.0 + M4 + M5 + M6 backend foundations CLOSED; M7 UI/notifications next
Returns / Refunds           ✅ Backend foundation CLOSED; UI/notifications remain for M7
Payouts                     ✅ Eligibility + Account Verification + Manual Batch backend CLOSED; secure UI/encryption wiring remains for M7
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
M1.1 Settlement Ledger          ✅ CLOSED
M2 Payment Core                 ✅ CLOSED
M3.0 Gateway Compatibility      ✅ CLOSED
M3 Real Gateway Integration     ⏸️ DEFERRED by owner
M4 Returns / Refunds Backend    ✅ CLOSED
M5 Payout Eligibility           ✅ CLOSED
M6 Payout Backend               ✅ CLOSED
M7 Money UI + Notifications     ← NEXT
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

## M4.1 — Return Workflow Foundation — CLOSED ✅

Implemented:

- Private Return Request / Return Item / Return Event model.
- Order Item + Quantity return granularity.
- Authenticated customer ownership boundary.
- Server-only Guest Return boundary using opaque Guest credential verification.
- Super Admin approve/reject, receive, and inspect transitions.
- Restockable quantity captured at inspection.
- Append-only Return audit events.

Still intentionally unresolved and not invented:

- Return window duration.
- Return shipping-cost responsibility policy beyond explicit per-refund IRTH exception.
- Excluded return cases.
- Custom / Made-to-Order return policy.

Closure record:

```text
docs/IRTH_M4_1_RETURN_REFUND_FOUNDATION_CLOSURE.md
```

## M4.2 — Refund Money Logic — CLOSED ✅

Implemented:

- Private `refunds` + `refund_items` financial snapshots.
- `partially_refunded` / `refunded` Payment summary states.
- Currency-aware cumulative proportional allocation for split partial refunds.
- Customer merchandise refund from historical trusted sale amounts.
- Shipping refund defaults to zero and is explicit IRTH-controlled only.
- Cumulative shipping refund cannot exceed historical Order shipping.
- Append-only settlement reversals for merchandise, IRTH subsidy, and Commission.
- Provider-independent trusted Refund success boundary.
- Browser cannot declare Refund success.
- Restockable finite inventory restored exactly once after inspected trusted Refund success.
- Payment and Return audit events.
- Idempotent repeated success handling.

Migration:

```text
supabase/migrations/20260831172254_create_refund_money_logic_foundation.sql
```

Closure record:

```text
docs/IRTH_M4_2_REFUND_MONEY_LOGIC_CLOSURE.md
```

## M5 — Payout Eligibility Foundation — CLOSED ✅

Owner-approved eligibility clock:

```text
Each Artisan Group's own Shipment delivered_at
↓
Configured Return Hold
↓
Payment collected
↓
No unresolved Return / Refund on the Order Item
↓
Positive append-only settlement balance
↓
Eligible for Payout
```

Implemented:

- `markets.payout_return_hold_days` configuration.
- Exact Return Hold duration remains `NULL` / unapproved.
- Missing Return Hold config fails closed with `configuration_missing`.
- Eligibility is derived from the Artisan's own Shipment delivery time, not whole-Order completion.
- New Return requests are blocked after the configured Return Window ends once a value is approved/configured.
- Eligibility amount comes from current append-only settlement balance.
- Payout execution remains separate from eligibility.

Migration:

```text
supabase/migrations/20260831173411_create_payout_eligibility_foundation.sql
```

Closure record:

```text
docs/IRTH_M5_PAYOUT_ELIGIBILITY_CLOSURE.md
```

Current live configuration remains deliberately fail-closed:

```text
Configured markets with payout_return_hold_days = 0
```

Therefore no live-normal payout becomes eligible merely because M6 exists.

## M6 — Payout Accounts + Manual Bank Transfer — CLOSED ✅

Approved first payout method:

```text
Bank Transfer
```

### M6.1 Payout Account Verification

Implemented:

- Private payout account records.
- `Pending Verification → Approve/Reject → Active` workflow.
- Changed approved details create a new pending request while old Active remains until approval.
- Approval atomically supersedes old Active account.
- At most one Active and one Pending account per Artisan + method.
- Sensitive account payload is stored as opaque encrypted ciphertext contract + fingerprint + key version, never modelled as plaintext bank-account columns.
- Payout account audit events are append-only.
- Sensitive historical fields are immutable.

### M6.2 Manual Payout Batches

Implemented:

- Manual Super Admin payout batches.
- Only currently M5-eligible Order Items can be reserved.
- Active verified Bank Transfer account required.
- One Order Item cannot be reserved in two pending batches.
- Batch creation is idempotent; idempotency-key reuse with different selection is rejected.
- Pending batch cancellation releases reservations without financial ledger effect.
- Mark Paid revalidates eligibility, balance and currency before any financial mutation.
- Paid payout creates one deterministic negative `payout` Settlement Ledger entry per Batch Item.
- Same Bank Reference replay is a no-op; a different replay reference is rejected.
- After full payout, settlement balance naturally becomes zero and another payout is blocked unless a legitimate future positive adjustment appears.

### M6 Preflight/Postflight Verification

Before M6:

```text
Existing payout-account/batch domain conflicts = 0
```

After M6:

```text
one-active unique guard copies       = 1
one-pending unique guard copies      = 1
one-reserved-item guard copies       = 1
batch-idempotency guard copies       = 1
payout-ledger sign constraint copies = 1
payout-ledger source copies          = 1
```

Controlled tests used fake encrypted values / fake transfer references only and were fully rolled back.

Final test leakage:

```text
Payout Accounts        = 0
Payout Account Events  = 0
Payout Batches         = 0
Payout Batch Items     = 0
Payout Batch Events    = 0
Payout Ledger Entries  = 0
```

No real Bank Transfer was executed.

Migrations:

```text
supabase/migrations/20260831175115_create_payout_account_verification_foundation.sql
supabase/migrations/20260831175315_create_manual_payout_batch_foundation.sql
supabase/migrations/20260831175523_harden_payout_foreign_key_indexes.sql
```

Closure record:

```text
docs/IRTH_M6_PAYOUT_ACCOUNTS_MANUAL_BANK_TRANSFER_CLOSURE.md
```

---

# 6. M7 — Real Money UI + Money Notifications — NEXT

M7 must replace remaining prototype/localStorage Money screens with real secure server-backed flows.

Important existing prototype debt:

```text
src/app/artisan/payouts/page.tsx
src/app/artisan/payouts/setting/page.tsx
src/app/dashboard-admin/commission/page.tsx
```

These old screens are not trusted financial implementations.

M7 priorities:

- Remove payout/bank-data localStorage behavior.
- Add secure server-only payout account submit/read/review routes.
- Implement application-side encryption/decryption for payout account payloads using server-only environment secrets and explicit key versioning.
- Never put raw payout/bank details in localStorage, sessionStorage, browser logs, server logs or unnecessary responses.
- Mask payout details in ordinary UI and expose only the minimum needed for authorized Admin verification.
- Build real Artisan payout status/history UI from trusted backend data.
- Build Super Admin payout-account verification + payout batch UI.
- Wire Return / Refund / Payout notifications through the existing Notification Layer.
- Keep actual Bank Transfer execution manual in MVP.

Exact bank-field requirements for the first market still require deliberate review before building the final form; M6 does not invent IBAN/account-field business requirements.

---

# 7. Taxes / Withholdings

No automatic tax or withholding rule/rate is invented.

The append-only ledger is designed to support explicit auditable adjustments if a later approved legal/accounting rule requires them.

Before real production payouts, any legally required withholding/tax handling must be explicitly reviewed and approved.

---

# 8. Security / Performance Review Notes

Known pre-existing Security Advisor items remain tracked:

- Legacy authenticated-executable SECURITY DEFINER function `public.review_product_market_price_request(...)`.
- Selected guarded M4 Return SECURITY DEFINER RPC notices.
- Supabase Auth Leaked Password Protection disabled.
- INFO for selected RLS-enabled/no-policy tables using narrow RPC boundaries.

M6 introduced no new Security Advisor warning.

M6 Postflight Performance Advisor initially reported M6 foreign keys without covering indexes. Migration `20260831175523_harden_payout_foreign_key_indexes` added only the M6-required covering indexes. Re-check confirmed no remaining `unindexed_foreign_keys` finding belongs to M6.

References:

- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

---

# 9. Immediate Next Task

```text
M7 — Real Money UI + Money Notifications
```

Real Payment Gateway selection/integration remains deferred until the owner reopens it.

The project remains in Pre-Live Financial Testing Mode. Before real financial operations on hosting/domain, perform the dedicated Production Readiness / Money Safety Review.

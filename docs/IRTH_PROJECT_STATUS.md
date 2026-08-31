# IRTH Project Status

**Project:** IRTH  
**Document Purpose:** Current implementation status of the IRTH MVP  
**Last Updated:** 31 August 2026  
**Current Position:** Phase 6 Money foundation CLOSED through M7. Next step is a structured remaining-MVP gap review before Phase 7 Testing & Polish. Real Online Gateway selection/integration remains intentionally deferred.

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
Notifications               ✅ Notification Foundation v0.1 + Money event wiring CLOSED
Money                       ✅ Phase 6 foundation CLOSED through M7
Returns / Refunds           ✅ Backend foundation CLOSED; remaining product-policy values still require later approval
Payouts                     ✅ Eligibility + Account Verification + Manual Batch + secure UI foundation CLOSED
Reviews                     🟨 Existing UI/foundation; verified-purchase integration still requires final gap review
Testing & Final Polish      ⬜ NEXT PHASE after remaining-MVP gap review
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
M7 Money UI + Notifications     ✅ CLOSED
Phase 6 Money Foundation        ✅ CLOSED
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

Important scope note:

> Provider-specific integration is deferred now. One real online gateway remains expected before final MVP launch unless the owner explicitly changes that scope.

## M4 — Returns / Refunds — BACKEND FOUNDATION CLOSED ✅

Implemented:

- Private Return Request / Return Item / Return Event model.
- Order Item + Quantity return granularity.
- Authenticated customer ownership boundary.
- Server-only Guest Return boundary using opaque Guest credential verification.
- Super Admin approve/reject, receive, and inspect transitions.
- Restockable quantity captured at inspection.
- Append-only Return audit events.
- Provider-independent Refund records and success boundary.
- Historical customer refund calculation from trusted Order snapshots.
- Currency-aware cumulative proportional partial-refund allocation.
- `partially_refunded` / `refunded` Payment summary states.
- Shipping refund defaults to zero and requires explicit IRTH-controlled exception.
- Settlement Ledger reversals instead of historical rewrites.
- Commission / IRTH subsidy reversal support.
- Idempotent Refund success handling.
- Trusted inventory restoration after inspection where restockable.

Still intentionally unresolved and not invented:

- Exact Return Window / Hold duration.
- Broader return-shipping cost policy.
- Excluded return cases.
- Custom / Made-to-Order return policy.

Closure records:

```text
docs/IRTH_M4_1_RETURN_REFUND_FOUNDATION_CLOSURE.md
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

Therefore no live-normal payout becomes eligible merely because M6/M7 exist.

## M6 — Payout Accounts + Manual Bank Transfer — CLOSED ✅

Approved first payout method:

```text
Bank Transfer
```

Implemented:

- Private payout account records.
- `Pending Verification → Approve/Reject → Active` workflow.
- Changed approved details create a new pending request while old Active remains until approval.
- Approval atomically supersedes old Active account.
- At most one Active and one Pending account per Artisan + method.
- Sensitive account payload stored as encrypted ciphertext contract + fingerprint + key version, not plaintext account-number columns.
- Payout account audit events are append-only.
- Manual Super Admin payout batches.
- M5 eligibility required before reservation.
- Active verified Bank Transfer account required.
- One Order Item cannot be reserved in two pending batches.
- Batch creation idempotency.
- Cancel releases reservation without financial ledger effect.
- Mark Paid revalidates eligibility/balance/currency.
- Paid payout creates one deterministic negative Ledger entry per Batch Item.
- Replayed same Bank Reference is a no-op; different replay reference is rejected.

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

## M7 — Secure Money UI + Money Notifications — CLOSED ✅

Implemented and verified:

- Server-only AES-256-GCM payout-data encryption/decryption.
- Random IV per encryption operation.
- Explicit encryption-key versioning.
- HMAC fingerprint for duplicate-data detection.
- Fail-closed behavior if payout encryption secret is missing/invalid.
- Local development key setup script that never prints the secret.
- Secure Artisan payout account submit/status API.
- Server-side Artisan identity resolution.
- Same-origin mutation protection.
- Secure Super Admin payout-account review API.
- Masked routine Admin payout views.
- Full decrypted details limited to explicit authorized Admin detail/review path.
- Real Artisan payout dashboard from trusted M5/M6 state.
- Super Admin payout operations UI.
- Money Notifications wired into existing Notification Layer for Payment / Return / Refund / Payout Account / Payout Batch events.
- Active payout flows no longer depend on localStorage for financial source of truth or bank-detail persistence.

M7 database migration:

```text
supabase/migrations/20260831181307_wire_money_notifications_and_artisan_payout_read.sql
```

Duplicate/drift checks passed:

```text
M7 migration copies                   = 1
money payment notification trigger    = 1
money return notification trigger     = 1
payout account notification trigger   = 1
payout batch notification trigger     = 1
artisan payout dashboard function     = 1
```

Production build verification passed locally on 31 August 2026:

```text
✓ Compiled successfully
✓ TypeScript passed
✓ Static generation 58/58
```

Core browser E2E passed with test data:

```text
Artisan submits payout details
→ Pending Verification
→ Super Admin reviews
→ Approves
→ Artisan account becomes Active
```

No real bank transfer or real-money operation was executed.

Closure record:

```text
docs/IRTH_M7_SECURE_MONEY_UI_CLOSURE.md
```

---

# 6. Phase 6 Closure

```text
M1.1 Settlement Ledger               ✅ CLOSED
M2 Payment Core                      ✅ CLOSED
M3.0 Gateway Compatibility           ✅ CLOSED
M3 Real Gateway Integration          ⏸️ DEFERRED BY OWNER
M4 Returns / Refunds Backend         ✅ CLOSED
M5 Payout Eligibility                ✅ CLOSED
M6 Payout Backend                    ✅ CLOSED
M7 Secure Money UI + Notifications   ✅ CLOSED

Phase 6 Money Foundation             ✅ CLOSED
```

This does **not** mean IRTH is production-money ready. It means the provider-independent Money architecture, core ledger/payment/refund/payout backend, and secure payout UI foundation are built and tested at the current Pre-Live stage.

---

# 7. Remaining Product / Launch Decisions

These points remain intentionally unresolved or deferred and must not be invented:

- Exact Return Hold / Return Window duration.
- Broader return-shipping cost responsibility policy.
- Excluded return cases.
- Custom / Made-to-Order return policy.
- First real Online Payment Gateway selection/integration.
- Production payout legal/accounting/tax/withholding requirements.
- Production email sender/domain readiness where still operationally pending.

---

# 8. Security / Performance Review Notes

Known pre-existing Security Advisor items remain tracked:

- Legacy authenticated-executable SECURITY DEFINER function `public.review_product_market_price_request(...)`.
- Selected guarded M4 Return SECURITY DEFINER notices.
- Supabase Auth Leaked Password Protection disabled.
- INFO for selected RLS-enabled/no-policy tables using narrow RPC boundaries.

M6/M7 introduced no new specific Security Advisor warning after review.

References:

- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

---

# 9. Immediate Next Task

Do **not** jump directly to generic polish.

Next task:

```text
Remaining MVP Gap Review
↓
Compare IRTH MVP Specification v0.1 against current implementation
↓
Classify each gap: required before Phase 7 / deferred / unresolved decision
↓
Then enter Phase 7 Testing & Polish
```

Known candidate gap already visible in status:

```text
Verified-purchase Review integration still requires final confirmation/review.
```

The exact next implementation task must be selected after this gap review rather than guessed.

Real Payment Gateway selection/integration remains deferred until the owner reopens it, while one real online gateway remains expected before final MVP launch unless scope changes.

The project remains in Pre-Live Financial Testing Mode. Before real financial operations on hosting/domain, perform the dedicated Production Readiness / Money Safety Review.

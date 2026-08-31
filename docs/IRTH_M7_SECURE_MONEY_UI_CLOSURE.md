# IRTH M7 — Secure Money UI + Money Notifications Closure

**Date:** 31 August 2026  
**Status:** CLOSED ✅  
**Scope:** Pre-Live secure Money UI / API / notification foundation. No real financial transfer was executed.

## 1. What M7 closed

M7 replaced the payout prototype path with trusted server-backed flows and connected the existing Money backend to secure application boundaries.

Implemented:

- Server-only payout data encryption/decryption.
- AES-256-GCM authenticated encryption with random 12-byte IV per encryption operation.
- Explicit encryption key versioning.
- HMAC fingerprint for duplicate-data detection without storing plaintext bank details.
- Fail-closed behavior when the payout encryption secret is missing/invalid.
- Local development key setup script that writes the secret to `.env.local` without printing the secret.
- Authenticated Artisan payout account submit/status API.
- Server-side Artisan identity resolution; browser does not choose the trusted Artisan identity.
- Same-origin checks for payout mutations.
- Secure Super Admin payout-account review API.
- Routine Admin payout overview returns masked account/IBAN values.
- Full decrypted payout data is limited to the explicit authorized Admin detail/review path.
- Trusted Artisan payout dashboard backed by M5/M6 data.
- Secure Super Admin payout operations UI and batch actions.
- Money notification wiring for Payment / Return / Refund / Payout Account / Payout Batch events using the existing Notification Layer.
- Existing payout localStorage prototype behavior was removed from the active payout flows.

## 2. Security boundaries verified

Application-side boundaries verified during review:

```text
Browser
  ↓ authenticated request
Next.js server route
  ↓ server-only secret / auth context
Trusted Supabase RPC
  ↓
Private financial tables / ledger
```

Key rules:

- Payout encryption key is never sent to the browser.
- Supabase privileged client requires server-side secret configuration and has no anonymous/public-key fallback.
- Raw payout/bank details are not persisted in localStorage/sessionStorage by the new payout flows.
- Ordinary Artisan status APIs never return decrypted payout data.
- Ordinary Admin overview masks sensitive account identifiers.
- Mutations remain server-authoritative and database authorization is still enforced underneath the Next.js API layer.

## 3. Duplicate / drift review

Live M7 migration count:

```text
20260831181307_wire_money_notifications_and_artisan_payout_read = 1
```

Live trigger copies verified:

```text
money_payment_notification_trigger   = 1
money_return_notification_trigger    = 1
payout_account_notification_trigger  = 1
payout_batch_notification_trigger    = 1
```

Trusted Artisan payout dashboard function copies:

```text
get_artisan_payout_dashboard = 1
```

No duplicate M7 migration/trigger path was introduced.

## 4. Production build verification

Owner local production build on 31 August 2026:

```text
npm.cmd run build
✓ Compiled successfully
✓ Finished TypeScript
✓ Collecting page data
✓ Generating static pages (58/58)
✓ Finalizing page optimization
```

Build included the new routes/pages:

```text
/api/admin/payout-accounts/[payoutAccountId]
/api/admin/payout-batches
/api/admin/payout-batches/[batchId]
/api/admin/payouts
/api/artisan/payout-account
/api/artisan/payouts
/artisan/payouts
/artisan/payouts/setting
/dashboard-admin/payouts
```

## 5. Browser E2E verification

Owner completed the core sensitive payout-account browser flow successfully using test data:

```text
Artisan submits payout details
→ Pending Verification
→ Super Admin opens payout review
→ Super Admin approves
→ Artisan payout account becomes Active
```

Result: **PASSED ✅**

No real bank transfer or real-money payout was executed.

## 6. Notifications

M7 uses the existing Notification Layer; it does not create a second notification system.

Money events are wired through existing append-only/trusted event sources, with dedupe keys for in-app/email notification emission.

Provider/domain production email readiness remains a separate production-launch concern.

## 7. Security Advisor result

Post-M7 Security Advisor showed no new M7-specific security warning.

Known pre-existing items remain tracked separately, including:

- selected guarded M4 Return authenticated SECURITY DEFINER notices,
- legacy `public.review_product_market_price_request(...)` SECURITY DEFINER notice,
- Supabase Auth leaked-password protection disabled,
- selected RLS-enabled/no-policy INFO notices.

These remain production-readiness debt and are not silently waived by M7 closure.

## 8. Pre-Live limitation

IRTH remains in **Pre-Live Financial Testing Mode**.

M7 closure does **not** mean:

- a real Payment Gateway has been selected or enabled,
- a real bank transfer has been executed,
- production secrets have been provisioned,
- Production Money Safety Review has been completed,
- taxes/withholdings have been legally finalized,
- Return Hold duration has been approved.

Before real financial operations on hosting/domain, run the dedicated Production Readiness / Money Safety Review.

## 9. Closure conclusion

```text
M7 Secure Money UI + Money Notifications  ✅ CLOSED
Phase 6 Money foundation                  ✅ CLOSED
```

The next project step should be selected from the remaining MVP gaps / Testing & Polish phase based on the Specification and current status; do not interpret M7 closure as final MVP launch readiness.

# IRTH M7 — Secure Money UI + Notifications Implementation Checkpoint

**Date:** 31 August 2026  
**Status:** IMPLEMENTED — LOCAL BUILD / BROWSER VERIFICATION PENDING 🟨

## Scope

M7 replaces the remaining prototype payout screens with secure server-backed flows and wires Money events into the existing Notification Layer.

This checkpoint is deliberately **not** a closure document yet because application code changed and IRTH requires local production-build and browser verification before closing an application task.

## Security Architecture Implemented

```text
Browser UI
  ↓ authenticated same-origin request
Next.js Server Route
  ↓ server-side session verification
Server-only Supabase privileged client
  ↓ narrow trusted RPC
Private Money / Payout domain
```

Sensitive payout data path:

```text
Artisan enters bank details
  ↓ HTTPS request to same-origin server route
Server validates + normalizes
  ↓
AES-256-GCM encryption on server only
  ↓
private.artisan_payout_accounts.details_ciphertext
```

Raw bank details are not stored in localStorage/sessionStorage and are not modelled as plaintext payout-account columns.

## Encryption

File:

```text
src/lib/payouts/crypto.ts
```

Implemented:

- `import "server-only"` guard.
- AES-256-GCM authenticated encryption.
- fresh random 12-byte IV per encryption.
- fixed versioned AAD: `IRTH:payout-account:v1`.
- explicit `encryption_key_version` support.
- HMAC-based deterministic fingerprint used for same-details detection without storing raw account data.
- strict bank-field normalization/validation before encryption and again after decryption.
- fail-closed behavior if the environment key is absent, invalid, wrong length, wrong version, malformed ciphertext, or authentication tag verification fails.
- ordinary masking helper for account/IBAN display.

Environment variable:

```text
IRTH_PAYOUT_DATA_ENCRYPTION_KEY_V1
```

The value is server-only and must never use a `NEXT_PUBLIC_` prefix.

## Safe Local Key Bootstrap

File:

```text
scripts/setup-payout-dev-key.mjs
```

The script:

- creates a cryptographically random 32-byte development key locally when one does not exist;
- writes only to `.env.local`;
- never prints the secret;
- refuses to overwrite an existing invalid/misconfigured value silently.

This is for local Pre-Live testing only. Production key management must be reviewed separately before launch.

## Artisan Payout Account Flow

Implemented routes/UI:

```text
GET/POST /api/artisan/payout-account
/artisan/payouts/setting
```

Security behavior:

- server session required;
- artisan profile is derived from authenticated `user.id`, not trusted from browser input;
- database RPC re-checks artisan ownership/role;
- mutation requires same-origin `Origin` validation;
- plaintext bank details are encrypted before calling the database RPC;
- encryption failure returns 503 and stores nothing;
- account-status responses never include ciphertext or raw bank details;
- form is cleared from React state after successful submit;
- old localStorage payout-account behavior is removed.

## Artisan Earnings / Payout UI

Implemented trusted payout dashboard backed by M5/M6 state rather than client calculations.

The dashboard derives:

- current outstanding settlement;
- available-for-payout amount;
- reserved-for-payout amount;
- paid payout amount/history;
- Order Item eligibility/hold/payment state;
- Payout Batch history.

The browser is not the source of truth for any financial value.

## Super Admin Payout Operations

Implemented Admin APIs/UI for:

- payout account review;
- explicit detail view of a payout account for authorized verification;
- approve/reject actions;
- M5 eligibility / payout availability review;
- manual Payout Batch creation;
- Payout Batch detail;
- cancel pending batch;
- mark manual Bank Transfer batch paid with transfer reference.

Sensitive-data minimization:

- routine Admin payout overview only decrypts currently operational `pending_verification` / `active` accounts;
- account numbers and IBANs are masked in the overview;
- historical rejected/superseded account ciphertext is not routinely decrypted;
- full bank details are returned only through the explicit Super-Admin account/detail flow where verification/manual transfer operations require them;
- all sensitive responses use `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.

## Mutation / Authorization Boundaries

Money mutations use:

- authenticated user session;
- same-origin mutation check;
- server-only privileged Supabase client;
- service-role-only public RPC execution;
- database-side Super Admin / Artisan ownership checks;
- M6 idempotency / unique reservation / ledger constraints.

The Next.js layer cannot bypass the database financial invariants merely by changing UI input.

## Money Notifications

Live migration:

```text
20260831181307_wire_money_notifications_and_artisan_payout_read
```

Git migration:

```text
supabase/migrations/20260831181307_wire_money_notifications_and_artisan_payout_read.sql
```

Wired through the existing Notification Layer for relevant Payment, Return/Refund, Payout Account, and Payout Batch events.

Notification dedupe remains based on deterministic event/source keys.

Database postflight verification:

```text
migration copies                         = 1
money_payment_notification_trigger       = 1
money_return_notification_trigger        = 1
payout_account_notification_trigger      = 1
payout_batch_notification_trigger        = 1
private.get_artisan_payout_dashboard     = 1
```

No duplicate M7 financial/notification trigger was found.

## Security Advisor Postflight

No new M7-specific Security Advisor finding was introduced.

Known existing findings remain tracked separately:

- RLS-enabled/no-policy INFO on selected controlled tables;
- guarded M4 authenticated SECURITY DEFINER Return RPC warnings;
- legacy `review_product_market_price_request(...)` warning;
- Supabase Auth leaked-password protection disabled.

References:

- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Production Safety

IRTH remains in **Pre-Live Financial Testing Mode**.

Before real hosted/domain financial operations:

- generate/store the production encryption key using production secret management;
- never reuse a local-development payout encryption key as a production operational secret without deliberate secure migration/key-management review;
- verify backup/recovery and key-rotation procedure;
- verify HTTPS, hosting environment isolation, live/test provider mode, reconciliation, logs/PII, and operational access controls;
- run the dedicated Production Readiness / Money Safety Review already required by project policy.

## Remaining Verification Before Closure

Required locally:

```text
git pull
node scripts/setup-payout-dev-key.mjs
npm.cmd run build
```

Then browser E2E should verify at minimum:

1. Artisan payout page loads trusted backend values.
2. Artisan payout-account submit reaches Pending Verification with no localStorage bank data.
3. Super Admin can view the pending request and explicitly inspect details.
4. Approve activates it; reject path also works in a separate controlled test.
5. Payout Batch creation requires a genuinely eligible earning and active account.
6. Cancel releases a pending batch reservation.
7. Mark-paid test uses a fake reference only in Pre-Live testing and produces exactly one payout ledger effect.
8. Notifications appear without duplicates.

Until those application/browser checks pass, M7 remains `IMPLEMENTED / VERIFICATION PENDING`, not CLOSED.

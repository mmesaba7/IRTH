# IRTH M6 — Payout Accounts + Manual Bank Transfer Closure

**Date:** 31 August 2026  
**Status:** CLOSED ✅  
**Scope:** Backend financial foundation only; no real bank transfer was executed.

## 1. Specification / Approved Rules

M6 implements the approved payout direction:

```text
Sale
→ Delivery
→ Return Period Ends
→ Eligible
→ Payout Cycle
```

Approved first MVP payout method:

```text
Bank Transfer
```

Any payout-account add/change follows:

```text
Pending Verification
→ IRTH Review
→ Approve
→ Active
```

The exact payout-cycle timing and the Return Hold duration remain unresolved. M6 does not invent either value.

## 2. Preflight Duplicate Audit

Before M6.1 and M6.2, live PostgreSQL was checked for existing payout/bank tables, functions, indexes and matching object names.

Result:

```text
Existing payout account tables: none
Existing payout batch tables:   none
Existing payout batch functions:none
Existing related M5 object:     private.artisan_payout_eligibility
Name conflicts before M6.1:     0
Name conflicts before M6.2:     0
```

M6 therefore extends M5 rather than duplicating an existing payout domain.

## 3. M6.1 — Payout Account Verification

Migration:

```text
20260831175115_create_payout_account_verification_foundation
```

### Private model

Created:

```text
private.artisan_payout_accounts
private.payout_account_events
```

Payout-account states:

```text
pending_verification
active
rejected
superseded
```

Only `bank_transfer` is a real method in this MVP foundation. The schema remains extensible for later approved methods.

### Sensitive payout data

Raw bank details are **not** modelled as plaintext bank-account columns.

The database contract stores:

```text
details_ciphertext
 details_fingerprint
encryption_key_version
```

`details_ciphertext` is an opaque encrypted payload boundary. Encryption/decryption itself belongs to the server-only application layer in M7.

No real bank details were used in M6 testing.

### Verification / replacement behavior

- First add → `pending_verification`.
- Same pending fingerprint submitted again → same record, `changed=false`.
- A different second pending request is rejected while one is already pending.
- Approved account → `active`.
- Same details as the active account → active record reused, `changed=false`.
- Changed details while an active account exists → new `pending_verification`; old active account remains usable until approval.
- Rejecting the change does not modify the old active account.
- Approving the change atomically makes the old account `superseded` and the new account `active`.
- Historical account records are not deleted or overwritten.

### Duplicate guards

Exactly one partial unique index exists for each rule:

```text
artisan_payout_accounts_one_pending_per_method = 1 copy
artisan_payout_accounts_one_active_per_method  = 1 copy
```

Therefore one Artisan + payout method can have at most:

```text
1 Active
+
1 Pending change request
```

but never two active accounts or two pending requests for the same method.

### Audit

`private.payout_account_events` is append-only.

Events include:

```text
payout_account_submitted
payout_account_approved
payout_account_rejected
payout_account_superseded
```

Sensitive immutable payout-account fields cannot be silently rewritten after insert.

## 4. M6.1 Controlled Test

A transaction/rollback test covered:

```text
Submit
→ Same Submit replay
→ Different duplicate Pending blocked
→ Approve
→ Same Active details replay
→ Submit changed details
→ Reject changed details
→ Submit another change
→ Approve replacement
→ Old Active becomes Superseded
```

Observed inside test:

```text
Accounts     = 3
Active       = 1
Pending      = 0
Rejected     = 1
Superseded   = 1
Audit Events = 7
```

After rollback:

```text
Payout Accounts       = 0
Payout Account Events = 0
```

## 5. M6.2 — Manual Bank Transfer Payout Batches

Migration:

```text
20260831175315_create_manual_payout_batch_foundation
```

Created:

```text
private.payout_batches
private.payout_batch_items
private.payout_batch_events
private.artisan_payout_availability
```

Batch states:

```text
pending
paid
cancelled
```

Batch Item states:

```text
reserved
paid
released
```

### Batch creation rules

A payout batch can be created only when each selected Order Item:

- is currently `eligible` according to M5;
- still has a positive trusted settlement balance;
- has an active verified Bank Transfer payout account;
- is not already reserved in another pending batch;
- uses the same currency / minor-unit scale as the batch.

The selected amount is snapshotted from the current append-only settlement balance at batch creation.

### Concurrent / duplicate protection

Exactly one copy exists of each important guard:

```text
payout_batch_items_one_reserved_per_order_item = 1
payout_batches_admin_idempotency_unique        = 1
artisan_settlement_ledger_payout_entry_sign    = 1
artisan_settlement_ledger_payout_source        = 1
```

Consequences:

- The same earning cannot be reserved in two pending batches at the same time.
- Repeating the same Admin + idempotency key + exact item selection returns the existing batch with `changed=false`.
- Reusing the same idempotency key for a different item selection is rejected.
- Duplicate or NULL Order Item IDs in one request are rejected.

### Cancellation

Pending batch cancellation:

```text
Batch pending
→ Cancel
→ Reserved Items released
→ No payout ledger entry
→ Items can be selected again if still eligible
```

A paid batch cannot be cancelled.

### Mark Paid

Before recording a manual bank transfer as paid, the database revalidates every reserved item again:

- item still exists;
- M5 eligibility is still `eligible`;
- current settlement balance is exactly equal to the reserved snapshot;
- currency still matches.

If anything changed, the payout is blocked and the batch must be rebuilt.

On success, one deterministic append-only settlement ledger entry is created per paid Batch Item:

```text
entry_type = payout
source     = payout_batch
amount     = negative reserved amount
```

This reduces that Order Item's current settlement balance. If fully paid, the M5 view naturally becomes `no_positive_balance`.

### Paid replay safety

- Repeating Mark Paid with the same Bank Reference → `changed=false`.
- Repeating with a different Bank Reference → rejected.
- Creating another payout for the same fully paid Order Item without a new positive adjustment → rejected.

This prevents accidental double payout while still allowing a future legitimate positive financial adjustment to become payable later.

## 6. M6.2 Controlled Lifecycle Test

A single rollback-safe transaction tested:

```text
Fake encrypted Payout Account
→ Approve
→ Temporary test eligibility setup
→ Create Batch 1
→ Replay same idempotency request
→ Different selection with same key blocked
→ Second concurrent reservation blocked
→ Cancel Batch 1
→ Reservation released
→ Create Batch 2
→ Mark Paid
→ Settlement balance becomes zero
→ Same Bank Reference replay is no-op
→ Different Bank Reference replay blocked
→ Second payout without new positive balance blocked
```

Observed inside the test:

```text
Paid Batches           = 1
Cancelled Batches      = 1
Paid Batch Items       = 1
Released Batch Items   = 1
Payout Ledger Entries  = 1
Batch Audit Events     = 4
```

All mutations were rolled back.

## 7. Final Zero-Leakage Verification

After all M6 controlled tests:

```text
private.artisan_payout_accounts = 0
private.payout_account_events   = 0
private.payout_batches          = 0
private.payout_batch_items      = 0
private.payout_batch_events     = 0
M6 payout ledger entries        = 0
```

No fake bank account, fake batch, fake transfer reference or payout ledger record remains in the live database.

## 8. Permissions

Direct sensitive table access is denied.

Verified:

```text
Authenticated direct payout-account SELECT = false
Authenticated direct payout-batch SELECT   = false
Service Role direct payout-account SELECT  = false
Service Role direct payout-batch SELECT    = false
```

Financial/action RPCs are server-only:

```text
submit payout-account request  authenticated=false / service_role=true
review payout-account request  authenticated=false / service_role=true
create manual payout batch     authenticated=false / service_role=true
record payout batch paid       authenticated=false / service_role=true
```

The RPCs additionally verify the supplied Artisan/Admin identity against trusted database roles/ownership.

## 9. Performance Postflight

The Performance Advisor identified M6 foreign keys without covering indexes after the first implementation.

A dedicated migration was applied:

```text
20260831175523_harden_payout_foreign_key_indexes
```

It adds covering indexes only for foreign keys introduced by M6.

After re-running the advisor, there are no remaining `unindexed_foreign_keys` findings belonging to M6. Older performance findings from other modules remain separate technical debt.

New indexes may initially appear as `unused_index`; this is expected immediately after creation in a pre-live database with no production payout traffic.

## 10. Security Advisor

No new M6-specific Security Advisor warning was introduced.

Known pre-existing notices remain tracked separately, including selected RLS/no-policy notices, legacy/Return SECURITY DEFINER review notices, and disabled leaked-password protection.

## 11. What M6 Does Not Do

M6 does **not**:

- execute a real bank transfer;
- contain a bank integration;
- store real bank credentials in plaintext;
- expose payout details directly to browser roles;
- implement the Artisan/Admin payout UI;
- implement application-side encryption/decryption;
- configure the unresolved Return Hold duration;
- automate payout scheduling.

## 12. Next

```text
M7 — Real Money UI + Money Notifications
```

M7 must replace the old localStorage payout prototypes with secure server-backed flows. It must implement server-only encryption/decryption and masking for payout-account details before real payout data can be entered through the application.

The project remains in approved Pre-Live Financial Testing Mode. A dedicated Production Readiness / Money Safety Review is required before any real financial execution is enabled.

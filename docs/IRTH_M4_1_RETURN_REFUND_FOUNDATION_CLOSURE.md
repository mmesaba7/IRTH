# IRTH M4.1 — Return / Refund Foundation Closure

**Date:** 31 August 2026  
**Status:** CLOSED ✅

## Scope

This milestone implements the secure Return foundation required by the approved MVP workflow without inventing unresolved policy details.

Specification-derived workflow:

```text
Customer requests Return
→ gives reason
→ IRTH reviews
→ approve / reject
→ if approved, coordinate physical return
→ IRTH receives and inspects returned items
→ Refund handling follows
```

The detailed Return policy remains unresolved by design, including:

- Return window duration.
- Return shipping cost responsibility.
- Excluded cases.
- Custom / Made-to-Order policy.

No automatic rule for those points is implemented here.

## Implemented Data Model

Private tables:

```text
private.return_requests
private.return_request_items
private.return_request_events
```

Return granularity is Order Item + Quantity as previously approved.

Each Return Item stores:

- Order Item reference.
- Requested quantity.
- Customer reason text.
- Inspected restockable quantity when physical inspection is completed.

## Current Return states

```text
requested
approved
rejected
received
inspected
refund_pending
partially_refunded
refunded
```

M4.1 implements trusted transitions through `inspected` only. Refund execution remains a later M4 sub-step.

## Customer / Guest Security

Authenticated customer:

- Can create a Return only for an Order owned by their authenticated user.
- Cannot request a quantity greater than the purchased quantity remaining outside rejected requests.

Guest customer:

- Guest Return creation is server-only.
- It requires the existing opaque Guest Order credential hash.
- Order Number alone is not authorization.
- Raw Guest credential is not persisted by the Return domain.

Cancelled Orders are not accepted as Return requests because they have no completed merchandise return lifecycle.

## Admin Security

Only Super Admin may:

- Approve or reject a Return request.
- Mark the returned goods received.
- Record physical inspection / restockable quantity.

Authorization is enforced at the trusted PostgreSQL boundary.

## Audit

`private.return_request_events` is append-only.

Implemented events include:

```text
return_requested
return_approved
return_rejected
return_received
return_inspected
```

Corrections must be represented by future events / trusted transitions rather than rewriting event history.

## Controlled Tests

A rollback-safe controlled test used an existing delivered customer Order and verified:

```text
request
→ approve
→ receive
→ inspect
```

Observed during the transaction:

```text
status               = inspected
reviewed              = true
received              = true
inspected             = true
quantity              = 1
restockable_quantity  = 1
event_count           = 4
```

The transaction was rolled back, so no test Return remained in production data.

The first inspection test exposed a PostgreSQL output-column ambiguity. It was fixed in a separate migration and the full controlled test then passed.

## Permissions Verified

```text
create_my_return_request
  anon          false
  authenticated true

create_guest_return_request
  anon          false
  authenticated false
  service_role  true

private Return tables
  authenticated direct SELECT false
  service_role SELECT          true
```

## Migrations

```text
20260831165016_create_return_refund_foundation
20260831165141_fix_return_inspection_ambiguity
```

## Explicitly Not Implemented Yet

M4.1 does not yet:

- Call any Payment Gateway.
- Calculate or execute customer Refund money.
- Mutate `orders.payment_status` to partially_refunded / refunded.
- Create refund ledger reversal entries.
- Restore inspected inventory to sellable stock.
- Add customer/admin Return UI.
- Add Return notifications.

These belong to the next M4 sub-steps and must reuse this foundation.

## Next

```text
M4.2 — Refund Calculation + Payment/Ledger Settlement Reversal
```

Refund execution must remain provider-independent and must not let the browser declare financial success.

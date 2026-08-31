# IRTH Tracking Metadata Verification

**Date:** 31 August 2026  
**Scope:** Admin Tracking Metadata Foundation  
**Status:** IMPLEMENTED + FUNCTIONALLY VERIFIED; FINAL PRODUCTION BUILD PENDING

---

## Goal

Provide a secure Super Admin-only way to store and update Shipment tracking metadata without coupling the MVP to a specific Courier API yet.

Implemented metadata:

- `courier_code`
- `tracking_number`
- `tracking_url`

The first real Courier is still not approved, so the architecture remains provider-neutral.

---

## Implementation

Migration:

```text
supabase/migrations/20260831094605_create_admin_tracking_metadata_foundation.sql
```

Application files:

```text
src/app/dashboard-admin/orders/TrackingMetadataForm.tsx
src/app/dashboard-admin/orders/actions.ts
src/app/dashboard-admin/orders/page.tsx
```

Database additions:

```text
shipment_tracking_history
private.update_admin_shipment_tracking(...)
public.update_admin_shipment_tracking(...)
```

Security boundary:

```text
Authenticated browser/server action
        ↓
public SECURITY INVOKER wrapper
        ↓
private SECURITY DEFINER function
        ↓
explicit private.is_super_admin() authorization
```

`anon` cannot execute the RPC.

`shipment_tracking_history` has RLS enabled and no direct Browser read/write grant.

---

## Validation Rules

- Courier code is optional.
- Courier code is normalized to lowercase.
- Courier code accepts lowercase English letters, numbers, `_` and `-` only.
- Tracking number is optional and length-limited.
- Tracking URL is optional.
- If present, Tracking URL must use HTTPS.
- Re-saving identical metadata is idempotent and does not create duplicate audit rows.

---

## Browser Verification

Test Shipment belongs to Order:

```text
IRTH-20260830-782EBA88
```

Test metadata entered through the real Admin UI:

```text
Courier code:    test_courier
Tracking number: TEST-12345
Tracking URL:    https://example.com/track/TEST-12345
```

Observed UI result:

- Courier code displayed.
- Tracking number displayed.
- Tracking link displayed.
- Second save with identical values returned: `بيانات التتبع لم تتغير.`

---

## Live Database Verification

Verified live state:

```text
Order status:      delivered
Payment status:    pending
Shipment status:   delivered
Courier code:      test_courier
Tracking number:   TEST-12345
Tracking URL:      https://example.com/track/TEST-12345
Tracking history:  1 row only
```

The single audit change is:

```text
null/null -> test_courier/TEST-12345
```

This confirms the second identical save did not create another history record.

---

## Security Verification

Verified function modes:

```text
private.update_admin_shipment_tracking = SECURITY DEFINER
public.update_admin_shipment_tracking  = SECURITY INVOKER
```

Verified privileges:

```text
anon EXECUTE:          false
authenticated EXECUTE: true
```

Authorization remains enforced inside the private function through `private.is_super_admin()`.

Earlier transaction tests also verified:

- non-Super-Admin rejection;
- insecure `http://` Tracking URL rejection;
- idempotent identical save;
- rollback left no accidental test metadata before the browser test.

---

## Remaining Closure Gate

The latest Tracking UI / Server Action commit has been exercised successfully in Next.js development mode and verified against Live Supabase.

However, a final `npm.cmd run build` result after the latest Tracking commit has not yet been recorded in the project conversation.

Therefore this subtask is **not marked CLOSED yet**.

Closure condition:

```text
latest GitHub main pulled locally
        +
npm.cmd run build passes
```

After that, Tracking Metadata Foundation may be marked CLOSED and work can move to Customer Tracking View + Secure Guest Tracking Link.

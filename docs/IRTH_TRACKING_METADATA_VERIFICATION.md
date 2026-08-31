# IRTH Tracking Metadata Verification

**Date:** 31 August 2026  
**Scope:** Admin Tracking Metadata Foundation  
**Status:** CLOSED ✅

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
Authenticated Admin UI / Server Action
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

The values above are test metadata and are not an approved production Courier configuration.

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

Transaction/security tests also verified:

- non-Super-Admin rejection;
- insecure `http://` Tracking URL rejection;
- idempotent identical save;
- rollback left no accidental test metadata before the browser test.

---

## Production Build Verification

Final build was run locally after pulling GitHub `main` at:

```text
9cb56f0d5b850b8e8cd2e87035db63b04a6e195a
```

Result:

```text
Next.js 16.3.1 (Turbopack)
Compiled successfully
TypeScript finished successfully
Static pages generated: 51/51
Build completed successfully
```

Local `HEAD` and `origin/main` matched at the same SHA before this closure-document commit.

---

## Closure

All closure gates passed:

1. Business/security direction approved.
2. Database implementation exists.
3. Admin UI implementation exists.
4. Browser save verified.
5. Live DB state verified.
6. Idempotency verified.
7. Authorization / RPC boundary verified.
8. HTTPS validation verified.
9. Final Production Build passed.

**Tracking Metadata Foundation is CLOSED ✅**

Next task:

```text
Customer Tracking View
+
Secure Guest Tracking Link
```

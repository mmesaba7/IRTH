# IRTH R3 Wholesale Closure

**Status:** CLOSED ✅  
**Stage:** Pre-Live MVP Gap Review  
**Date:** 1 September 2026

## Approved MVP behavior

Wholesale is part of the MVP with two entry points:

1. Product Page → `Wholesale / طلب كمية`
2. Standalone `/wholesale` page

Both use the same backend/domain. Requests are received by IRTH only. Customer contact information is not exposed directly to Artisans.

## Implemented foundation

- Private `private.wholesale_requests` table.
- Server-only request creation boundary through Next.js API.
- General and Product-specific request source types.
- Request fields include name, company, country, contact details, requested product/craft, quantity, destination and notes.
- Super Admin-only inbox/read boundary.
- Super Admin close/reopen state boundary.
- In-App notification to Super Admin when a new Wholesale request is received.
- No Artisan Wholesale read endpoint or direct access to customer contact data.
- Direct table SELECT denied to `anon` and `authenticated`.

## Controlled backend tests

Verified with rollback-safe tests:

- Valid request creation succeeds.
- Exactly one Admin notification is emitted for the test request.
- Super Admin read boundary returns the request.
- Invalid quantity (`0`) is rejected.
- Non-Super-Admin Admin-inbox access is rejected with `admin_required`.
- Test request and test notification were fully rolled back after the controlled test.

## Browser E2E

A real local Browser request was submitted through `/wholesale` with:

- Name: `Wholesale Test`
- Company: `IRTH Test`
- Country: `Egypt`
- Contact: `test@example.com`
- Requested product/craft: `Handmade pottery`
- Quantity: `25`
- Destination: `Cairo`
- Notes: `Wholesale browser E2E test`

Verified from Live Supabase:

- Request persisted successfully.
- Request source was `general`.
- Request remained open after submission.
- Super Admin notification was created with event `wholesale_request_received`.
- Notification linked to `/dashboard-admin/wholesale`.
- Super Admin read boundary returned the complete request.

The Browser E2E test request was then closed through the trusted Super Admin boundary with note:

`Pre-live browser E2E completed successfully`

Post-close verification confirmed:

- `is_closed = true`
- `closed_at` recorded
- `closed_by_user_id` recorded
- Admin note recorded

## Privacy result

Customer contact data is stored only in the private Wholesale domain and is available through the Super Admin boundary. There is no Artisan-facing Wholesale data path carrying the customer's contact details.

## Result

```text
General Wholesale request
→ IRTH receives request
→ Super Admin notification
→ Super Admin inbox
→ Admin closes request
```

R3 Wholesale is CLOSED for the current Pre-Live MVP stage.

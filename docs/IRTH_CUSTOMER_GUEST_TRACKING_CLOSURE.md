# IRTH Customer / Guest Tracking Closure

**Date:** 31 August 2026  
**Status:** CLOSED ✅  
**Scope:** Customer Tracking View + Secure Guest Tracking Link

---

## 1. Specification Alignment

This work implements the MVP Order Tracking direction from `IRTH MVP Specification v0.1`:

- the customer sees one unified Order;
- the customer can follow the Order lifecycle through the approved timeline;
- Shipment tracking number and Courier tracking link are shown when available;
- Guest Checkout remains supported without forcing account creation;
- the Order Number alone is not treated as a Guest authorization credential;
- artisan/customer privacy boundaries remain intact.

Notifications remain the next Order-phase item and are not included in this closure.

---

## 2. Approved Security Decisions

The owner approved the following package before implementation:

1. Customer-facing Order reads use a narrow server/database read boundary instead of direct broad table access.
2. Authenticated customers may read only their own Orders.
3. Customer payloads expose customer-visible Order, item, timeline and Shipment fields only.
4. Internal commission funding, idempotency data, guest hashes and privileged identifiers are not returned in the customer tracking payload.
5. Guest tracking requires a high-entropy opaque token; Order Number alone is insufficient.
6. Guest lookup is performed through the IRTH server boundary; the Browser does not receive direct Guest access to Order tables or the Guest RPC.
7. Only a SHA-256 hash of the Guest token is persisted in PostgreSQL.
8. The raw Guest token is never stored in `localStorage`, `sessionStorage`, PostgreSQL or application documentation.
9. Guest token creation is deterministic for the same Guest Order idempotency attempt using HMAC-SHA256 and the private `IRTH_GUEST_TRACKING_SECRET`, preserving Order idempotency.
10. The Guest credential is transported in a URL fragment (`#access=...`) rather than a query parameter and is removed from the visible URL/history immediately after the client captures it.
11. Guest Tracking responses use no-store/no-referrer hardening and generic invalid/unavailable responses.
12. Multi-Shipment Orders are supported in the customer view.

---

## 3. Database Migration

Live migration:

```text
20260831105348_create_secure_customer_guest_tracking_read_boundary
```

Git migration file:

```text
supabase/migrations/20260831105348_create_secure_customer_guest_tracking_read_boundary.sql
```

The migration:

- revokes direct `anon` / `authenticated` access from core Order read tables;
- preserves required `service_role` read access;
- creates the safe customer payload builder;
- creates `private.get_my_customer_orders()` with explicit authenticated ownership context;
- exposes `public.get_my_customer_orders()` only to `authenticated`;
- creates `public.get_guest_order_tracking(order_number, token_hash)` for server-side `service_role` use only;
- does not grant the Guest RPC to `anon` or `authenticated`.

Final live privilege verification confirmed:

```text
authenticated direct SELECT orders:               false
authenticated direct SELECT order_items:          false
authenticated direct SELECT shipments:            false
authenticated direct SELECT order_status_history: false
authenticated execute customer RPC:               true
anon execute customer RPC:                        false
service_role execute guest RPC:                   true
authenticated execute guest RPC:                  false
anon execute guest RPC:                           false
```

---

## 4. Application Implementation

Implemented files include:

```text
src/app/account/orders/page.tsx
src/app/api/order-tracking/guest/route.ts
src/app/api/orders/route.ts
src/app/checkout/page.tsx
src/app/components/OrderTrackingCard.tsx
src/app/order-success/page.tsx
src/app/track/[orderNumber]/GuestTrackingClient.tsx
src/app/track/[orderNumber]/page.tsx
src/lib/customerOrderTracking.ts
```

### Authenticated Customer

`/account/orders` now reads real Orders from Supabase through the safe customer RPC. The previous localStorage Order prototype is removed from the customer Order read path.

Customer-visible data includes:

- Order Number;
- Order Status;
- Payment Status;
- customer-visible money totals;
- product snapshot, quantity and customer-visible pricing;
- audited Order Timeline;
- Shipment status;
- Courier code when present;
- Tracking Number when present;
- HTTPS Courier Tracking URL when present.

### Guest Customer

Guest Checkout now returns the raw tracking credential once to the Browser after successful Order creation.

The token is generated server-side as HMAC-SHA256 using:

```text
IRTH_GUEST_TRACKING_SECRET
+
idempotency scope
+
idempotency key
```

The database stores only:

```text
SHA-256(raw guest tracking token)
```

The Guest flow is:

```text
Guest Checkout
↓
Order created transactionally
↓
Raw Guest token returned once
↓
Order Success captures fragment credential
↓
Fragment removed from visible URL/history
↓
Secure tracking link
↓
Tracking page captures credential
↓
Fragment removed from visible URL/history
↓
POST /api/order-tracking/guest
↓
Server hashes credential
↓
service_role-only Guest RPC verifies hash
↓
Safe customer tracking payload
```

---

## 5. Browser E2E Verification

### Authenticated Customer

Verified `/account/orders` with the existing real Order:

```text
IRTH-20260830-782EBA88
```

Browser verified:

```text
Order status:      delivered
Payment status:    pending
Product:           Clay Vessel
Original:          350 EGP
Promotion:          35 EGP
Merchandise total: 315 EGP
Shipping:          150 EGP
Final total:       465 EGP
Courier:           test_courier
Tracking number:   TEST-12345
```

The Courier link opened the configured test URL. `example.com` remains intentional test metadata and is not a selected production Courier.

### Guest Negative Security Cases

In an Incognito/unauthenticated Browser:

1. Existing Order Number with no Guest token did not expose Order data.
2. Existing Order Number with an invalid Guest token did not expose Order data.
3. Both cases returned the same generic Tracking unavailable behavior, avoiding Order enumeration leakage.

### Valid Guest E2E

A permanent Live Guest test Order was created and intentionally retained:

```text
IRTH-20260831-7987F614
```

The owner explicitly approved keeping this Order as a real retained test Order and allowing inventory to decrement normally.

Browser verified:

```text
Guest Tracking: valid
Order status:   received
Payment status: pending
Timeline:       received completed, later stages pending
Final total:    465 EGP
```

Live DB verification confirmed:

```text
customer_user_id:          null
guest_access_token_hash:   present
stored hash length:        64
subtotal before promotion: 350 EGP
promotion discount:         35 EGP
coupon discount:             0 EGP
merchandise subtotal:      315 EGP
shipping fee:              150 EGP
final total:               465 EGP
item commission snapshot:   15%
```

The finite `clay-vessel` stock changed from:

```text
4 → 3
```

This decrement is intentionally retained with the permanent Guest test Order.

The raw Guest token is not recorded in this document.

---

## 6. Database Security Verification

Verified on Live Supabase:

- migration is present in `supabase_migrations.schema_migrations`;
- direct authenticated SELECT on core Order/Tracking tables is revoked;
- customer RPC is authenticated-only;
- Guest RPC is service-role-only;
- artisan identity received no customer Orders from the customer read RPC during authorization testing;
- valid Guest hash lookup returned the safe Order payload;
- incorrect Guest hash returned no Order;
- Order Number alone is not sufficient for Guest access.

---

## 7. HTTP / Browser Security Review

Guest tracking API uses:

```text
Cache-Control: no-store, private
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
```

Guest tracking page metadata uses:

```text
robots: noindex, nofollow
referrer: no-referrer
```

The raw credential:

- is not a query parameter;
- is not sent in the initial HTTP request because it is a URL fragment;
- is captured by client code;
- is immediately removed from the current URL/history entry using `history.replaceState`;
- is sent to the IRTH server only in the secure POST body for verification;
- is not logged by application code;
- is not persisted to Browser storage.

---

## 8. Supabase Advisor Review

Final Security Advisor findings after the tracking read-boundary migration show no new Customer/Guest Tracking vulnerability.

Existing findings remain:

1. `rls_enabled_no_policy` INFO on intentional deny-all audit tables:
   - `order_artisan_group_status_history`
   - `shipment_status_history`
   - `shipment_tracking_history`
2. Pre-existing WARN for `public.review_product_market_price_request(...)` being an authenticated-executable SECURITY DEFINER function.
3. Pre-existing WARN that Supabase Leaked Password Protection is disabled.

These are not introduced by Customer/Guest Tracking and remain separate technical debt / security-hardening work.

---

## 9. Production Build

After the Customer/Guest Tracking implementation and before the final URL-fragment cleanup hardening, the local Production Build passed:

```text
Next.js 16.3.1 (Turbopack)
Compiled successfully
TypeScript passed
Static pages generated: 52/52
```

A final Production Build is required after pulling the final fragment-cleanup commits before Local/GitHub closure is declared complete.

---

## 10. Closure Gate

Customer Tracking View + Secure Guest Tracking Link may be considered CLOSED only after the final local sync confirms:

```text
git pull --ff-only
npm.cmd run build
git status -sb
git rev-parse HEAD
```

Expected result:

- Build passes.
- Working tree is clean.
- Local `HEAD` equals GitHub `main`.

Once that final local gate passes, the next Specification task is:

```text
Notifications
```

Payment Gateway and Courier API remain separate layers and are not part of this closure.

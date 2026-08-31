# IRTH — Admin Order + Shipping Status Foundation Closure

**Date:** 31 August 2026

## Status

**CLOSED ✅**

This closure records the completed and verified Admin Order + Shipping Status Foundation following the approved IRTH MVP rules.

## Implemented

- Super Admin order confirmation through a protected server/database action.
- Order Status remains separate from Payment Status.
- `received -> confirmed` is the explicit Admin confirmation boundary.
- Overall Order status is aggregated conservatively from Artisan Groups and Shipments.
- One Shipment per Artisan Group for the MVP, protected by a unique constraint.
- Existing groups already at `ready_for_courier_pickup` were safely backfilled with one `pending` Shipment.
- Shipment lifecycle foundation:
  - `pending`
  - `picked_up_from_artisan`
  - `in_transit`
  - `delivered`
  - exceptional `delivery_failed`
- Shipment status transitions are server-controlled and validated.
- Shipping actions are blocked before Order confirmation.
- Order status advances from shipment state without coupling to Payment Status.
- `shipment_status_history` records shipment lifecycle changes.
- `order_status_history` records overall Order lifecycle changes.
- Duplicate confirmation is idempotent and does not create duplicate history.
- Admin Orders UI is backed by Live Supabase data, not `localStorage`.
- Admin Orders displays Artisan Groups and Shipment state.
- Public RPC wrappers remain `SECURITY INVOKER`.
- Privileged database implementation remains in `private` schema with explicit Super Admin authorization.
- No Courier API, Payment Gateway, Notification delivery, or Return engine was added in this milestone.

## Browser / Live E2E Verification

Verified using Order:

`IRTH-20260830-782EBA88`

Final live state after the browser test:

- Order Status: `delivered`
- Payment Status: `pending`
- Artisan Fulfillment Status: `ready_for_courier_pickup`
- Shipment Count: `1`
- Shipment Status: `delivered`
- `delivered_at`: recorded

Order history verified in order:

`received -> confirmed -> ready_for_courier_pickup -> picked_up_from_artisan -> in_transit -> delivered`

Shipment history verified in order:

`pending -> picked_up_from_artisan -> in_transit -> delivered`

The initial Shipment creation is also audit-recorded as `null -> pending`.

## Build Verification

Final production build passed after the complete Admin/Shipping UI and database changes:

- Next.js 16.3.1 / Turbopack
- Production compilation passed
- TypeScript passed
- Static page generation passed
- `/dashboard-admin/orders` is dynamic/server-rendered

## Security Verification

- Non-Super-Admin users cannot use the Admin Order/Shipping RPCs successfully.
- Shipment and fulfillment history tables have RLS enabled and are intentionally not exposed for direct browser reads/writes.
- No new Security Advisor warning was introduced for the new Admin Order/Shipping RPC pattern.
- Existing unrelated Security Advisor findings remain separate technical debt.

## Scope Boundary

This milestone does not select a Courier company and does not implement Courier API integration.

Tracking metadata fields already exist on `shipments` (`courier_code`, `tracking_number`, `tracking_url`) but a complete Tracking Foundation is the next separate milestone and requires its own approved behavior before implementation.

## Non-blocking Observation

During local dev startup, `/api/markets` returned one transient HTTP 500 and then subsequent requests returned 200 successfully. It did not reproduce during the completed order/shipping tests and is not considered a blocker. If it recurs, investigate it as a separate reliability issue rather than guessing the cause.

# IRTH Admin Order Read Foundation — Closure

**Status:** CLOSED ✅  
**Date:** 31 August 2026

## Scope

This closure records the completion of the real Super Admin Order read surface after the transactional Order foundation, Artisan Order read flow, and Artisan fulfillment actions.

## Implemented

- Replaced the old `/dashboard-admin/orders` localStorage prototype with live Supabase/PostgreSQL order data.
- Added secure `get_admin_orders()` database read boundary.
- Kept the exposed public RPC as `SECURITY INVOKER`.
- Kept privileged table access inside the private schema with an explicit `private.is_super_admin()` authorization check.
- Anonymous users cannot execute the Admin Order RPC.
- Signed-in non-admin users are rejected inside PostgreSQL with `admin_required`.
- Super Admin can view the unified Order, customer/delivery snapshot, trusted money snapshot, internal Artisan Groups, Order Item snapshots, fulfillment state, and commission-rate snapshot.
- Removed fake localStorage order updates/actions from the Admin Order page. The current Admin surface is intentionally read-only until Order/Shipping state-transition rules are separately approved and implemented.

## Verified browser order

`IRTH-20260830-782EBA88`

Verified values:

- Order status: `received`
- Payment status: `pending`
- Currency: `EGP`
- Original merchandise: `350.00`
- Promotion discount: `35.00`
- Merchandise subtotal: `315.00`
- Shipping: `150.00`
- Final total: `465.00`
- Artisan: Ahmed Hassan
- Artisan fulfillment: `ready_for_courier_pickup`
- Product: Clay Vessel
- Quantity: `1`
- Commission-rate snapshot: `15.00%`

The Admin page correctly displays customer contact and delivery information because the Super Admin role is authorized to manage fulfillment. This does not change the existing privacy rule that Artisans must not receive phone, email, WhatsApp, full address, or direct-contact information.

## Verification

- Database positive authorization test: Super Admin read succeeded.
- Database negative authorization test: non-admin read rejected.
- No new Admin Orders-specific Security Advisor warning.
- Browser functional verification passed.
- Next.js Production Build / TypeScript passed after the final implementation.

## Boundary

This closure covers **Admin Order Read only**.

It does not approve or implement:

- Admin Order status transitions.
- Order-level aggregation from Artisan Group statuses.
- Shipment creation/transition rules.
- Courier API integration.
- Tracking updates.
- Payment integration.
- Cancellation/return/refund workflow.

Those remain separate controlled steps under the IRTH MVP Specification.

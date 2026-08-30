# IRTH S15.5 Checkout Decision Register

**Status:** APPROVED  
**Date:** 30 August 2026

This register records owner-approved S15.5 Checkout Foundation decisions. It supplements, and does not replace, **IRTH MVP Specification v0.1**. If a conflict appears, the Specification remains authoritative unless the owner explicitly changes it.

## Approved decisions

1. **Checkout layout:** one-page, short, Mobile-First checkout with clearly separated sections.
2. **Checkout customer fields:** `recipient_name`, `email`, `phone`, `country_code`, `administrative_area`, `city`, `address_line1`, and optional `delivery_notes`. `postal_code` and `address_line2` are not required in the current MVP checkout foundation.
3. **Email:** required for Guest Checkout and transactional order communication; it is not a marketing opt-in.
4. **Recipient name:** one full-name field rather than forced first/last-name splitting.
5. **Market / delivery-country lock:** the selected Market determines the allowed shipping country. The customer's physical Geo location is suggestion-only. Example: a customer physically in Saudi Arabia may intentionally select the Egypt Market to send an order to Egypt; that order then uses Egypt pricing/currency and must ship to Egypt. Changing delivery country requires changing Market first and re-quoting.
6. **Administrative area:** for Egypt, use a Governorate selection plus free-text City. Architecture keeps the generic field name `administrative_area` for future countries.
7. **Phone validation:** required with reasonable normalization/length validation; do not hard-code Courier-specific phone rules before the Courier is approved.
8. **Sensitive checkout PII:** name, email, phone, address, and delivery notes must not be stored in `localStorage` or `sessionStorage`. Browser cart storage remains product/quantity intent only.
9. **Guest vs authenticated customer:** Guest Checkout does not create an account automatically. Authenticated customers may receive name/email prefill, but checkout delivery details remain order-specific input and do not silently overwrite account data.
10. **Optional account creation:** do not put mandatory account/password creation inside Checkout. After successful Guest Checkout, offer optional account creation.
11. **Checkout login return:** Sign in from Checkout should safely return to `/checkout`; only safe internal return destinations may be accepted.
12. **Saved addresses:** full Address Book management is not part of S15.5.2. Do not auto-save a checkout address to the account without an explicit future decision/user action.
13. **Order address snapshot:** future real Orders must snapshot customer/contact/delivery data at order time so later account edits do not alter historical orders.
14. **Delivery notes privacy:** delivery notes are IRTH/Shipping-only by default and are not exposed to Artisans. Product customization/manufacturing notes, if needed, are a separate concept.
15. **Marketing use:** Guest checkout email/phone are transactional-only for now. No automatic newsletter/marketing enrollment.
16. **Customer-data security boundary:** sensitive customer contact/address data stays in protected server-side records. Artisan-facing APIs/RPCs must use safe projections and never expose phone, email, WhatsApp, full address, or direct-contact information.
17. **Per-customer Coupon identity:** authenticated customer identity uses `user_id`; Guest identity should use normalized email-derived identity/hash where sufficient. Guest Checkout remains allowed even though no guest identity mechanism can perfectly prevent use of a different email.
18. **Guest order tracking:** future Guest tracking should use a secure opaque access token/link. Order number alone is not an authorization credential.
19. **Server validation:** customer inputs and commerce state are revalidated server-side. Checkout must reuse server commerce functions directly rather than trusting client totals or making internal HTTP calls to its own Cart API.
20. **S15.5.2 boundary:** Customer Details + Guest/Auth behavior + server validation + privacy only. Do not create a real Order yet.
21. **Coupon consumption:** Quote/Checkout review never consumes redemption. Redemption happens only in the future secure order/payment transaction at the approved lifecycle point.
22. **Idempotency:** future order-creation endpoint must prevent duplicate Orders from repeated clicks/retries.
23. **Inventory:** future Order creation must atomically revalidate and reserve/decrement applicable stock; an earlier Checkout quote is not sufficient by itself.
24. **Shipping price:** do not invent Egypt shipping fees/free-shipping thresholds. Shipping/final-total rules require their own approved configuration before final order confirmation.
25. **Payment method:** do not choose or hard-code the first Payment Gateway during S15.5.2. Payment Layer remains separate; COD/online availability should ultimately be Market-configured.
26. **Exact Order schema:** do not silently choose final Order/Order Item/Internal Group/Shipment table naming during S15.5.2. Approve the transactional Order model before creating real Order tables.

## S15.5 implementation sequence

```text
S15.5.1 Trusted Checkout Summary ✅
        ↓
S15.5.2 Customer Details + Guest Checkout Foundation ← CURRENT
        ↓
S15.5.3 Shipping / Final Total Boundary
        ↓
S15.5.4 Order Creation Transactional Design
        ↓
Payment integration remains a separate layer
```

## Geo / Market clarification

```text
Physical location
      ↓
Geo suggestion only
      ↓
Customer-selected Market
      ↓
Market pricing + currency
      ↓
Allowed delivery country for that order
```

For the currently approved launch state:

```text
Egypt Market
→ EGP prices
→ delivery country Egypt
```

Future Saudi Market example:

```text
Saudi Market
→ SAR prices
→ delivery country Saudi Arabia
```

# IRTH — Phase 6 Money Decision Register

**Date:** 31 August 2026  
**Status:** APPROVED  
**Scope:** Phase 6 — Money

This register records owner-approved Phase 6 Money decisions. It supplements, and does not replace, **IRTH MVP Specification v0.1**. If a conflict appears with an older unresolved note, the explicitly approved decision below is the current project decision unless the owner later changes it.

---

# 1. Existing Money Foundations — Reuse, Do Not Rebuild

The following foundations already exist and must be reused:

- Market-specific pricing.
- Exact money arithmetic and Round Half-Up behavior.
- Product Promotions.
- Coupons.
- IRTH-funded vs Artisan-funded discount attribution.
- Trusted server-side Cart / Checkout quote.
- Historical Order money snapshots.
- Commission configuration by Craft with optional Artisan override.
- Historical commission-rate snapshot on each Order Item.
- Separate Order Status and Payment Status.
- Independent Payment, Shipping and Notification layers.

Current launch commission configuration:

```text
15% for all current Crafts
0 Artisan overrides currently
```

---

# 2. Approved Money Decisions

## M-D1 — Commission + Discount Funding Treatment

**Decision:**

- Artisan-funded Product Promotion / Coupon amounts reduce the Artisan settlement base and therefore reduce the Commission base.
- IRTH-funded Product Promotion / Coupon amounts do **not** reduce the Artisan's economic settlement base. IRTH bears that subsidy separately.

Conceptual example:

```text
Original merchandise amount        1000
IRTH-funded discount                200
Customer payment                    800
Artisan settlement base            1000
Commission @ 15%                    150
Artisan amount before adjustments   850
```

If the same 200 discount is Artisan-funded:

```text
Original merchandise amount        1000
Artisan-funded discount              200
Artisan settlement base             800
Commission @ 15%                    120
Artisan amount before adjustments   680
```

Customer discount and funding attribution remain separate trusted concepts.

Classification: 🟢 MVP.

---

## M-D2 — Append-Only Financial / Settlement Ledger

**Decision:** use an append-only financial/settlement ledger rather than recalculating all financial history only at UI read time or silently overwriting prior financial events.

Future ledger event types may include, as owning modules become real:

- Sale / Artisan entitlement.
- Commission.
- IRTH-funded subsidy.
- Tax / withholding adjustment.
- Refund.
- Commission reversal.
- Payout.

Corrections should be represented by new auditable entries rather than destructive historical rewrites.

Classification: 🟢 MVP.

---

## M-D3 — Dedicated Payment Domain

**Decision:** `orders.payment_status` remains a useful summary, but is not the sole Payment record.

Payment architecture must support a dedicated Payment Domain with trusted transaction/event history.

```text
Order
↓
Payment Method
├─ Online
└─ COD
↓
Payment transaction/event history
↓
Order payment_status summary
```

Browser/Client must never be trusted to declare that payment succeeded.

Classification: 🟢 MVP.

---

## M-D4 — Return Granularity

**Decision:** Returns/Refunds must support **Order Item + Quantity** granularity rather than forcing full-order return only.

This is required because one IRTH Order can contain items from multiple Artisans.

Classification: 🟢 MVP.

---

## M-D5 — Configurable Return Hold / Fail-Closed Payout Eligibility

**Decision:** do not invent or hard-code the final Return Window duration.

Payout eligibility must be able to use a configurable return hold. If the required return-period configuration is not approved/configured, automatic eligibility must fail closed rather than assume a duration.

Conceptual lifecycle:

```text
Delivered
↓
Return hold ends
↓
No unresolved return/refund condition
+ Payment collected
↓
Eligible for Payout
```

The exact number of return days remains unresolved and requires a future Business/Legal decision.

Classification: 🟢 MVP architecture/correctness.

---

## M-D6 — Manual Super Admin Payout Batches in MVP

**Decision:** MVP uses Super Admin-controlled/manual Payout Batches from already eligible Artisan earnings.

Automated weekly/biweekly/monthly payout scheduling is not implemented now.

Classification:

- Manual Payout Batch: 🟢 MVP.
- Automated payout scheduling: 🟡 Architecture Later / Post-MVP implementation.

---

## M-D7 — First Artisan Payout Method

**Decision:** **Bank Transfer** is the first payout method for the MVP.

Architecture should not prevent additional payout methods later, but only one real method is implemented initially.

Classification:

- Bank Transfer first method: 🟢 MVP.
- Multiple payout methods: 🔵 Post-MVP implementation / architecture extensibility only now.

---

## M-D8 — Taxes / Withholdings

**Decision:** do not invent an automatic tax, tax rate or withholding rule before an approved legal/accounting decision exists.

The financial ledger architecture must be able to support explicit auditable adjustment entries with amount, reason/reference and actor/time metadata when needed.

Until a formal rule exists:

```text
Automatic Tax Rule = NONE
Automatic Withholding Rule = NONE
```

This does **not** mean production payouts may ignore a legally required withholding; any legally required rule must be approved/configured before real production payouts.

Classification:

- Adjustment-capable ledger: 🟢 MVP.
- Advanced automatic tax engine: 🔵 Post-MVP unless later required for legal correctness.

---

## M-D9 — First Payment Gateway Selection Timing

**Decision:** do not choose or hard-code the first Online Payment Gateway before the provider-independent Payment Core is defined.

Sequence:

```text
Provider-independent Payment Core
↓
Required gateway contract
↓
Official-current provider comparison
↓
Owner decision
↓
One MVP gateway adapter
```

Classification:

- One Payment Gateway: 🟢 MVP.
- Provider-independent architecture: 🟡 Architecture Later capability designed into MVP.
- Multiple real gateway integrations: 🔵 Post-MVP.

---

## M-D10 — Pending Online Payment / Inventory Safety

**Decision:** when Online Payment is implemented, failed or expired pending-payment Orders must have a trusted cancellation / finite-stock restoration path where applicable.

Current Order creation decrements finite stock atomically. Online Payment must therefore not leave failed/expired unpaid Orders permanently consuming stock.

This is an MVP correctness requirement, not feature creep.

Classification: 🟢 MVP.

---

# 3. Approved Phase 6 Implementation Sequence

```text
M1 — Commission + Settlement Ledger Foundation
↓
M2 — Payment Core Foundation
↓
M3 — First Online Payment Provider
↓
M4 — Returns / Refunds Foundation
↓
M5 — Payout Eligibility Foundation
↓
M6 — Payout Accounts + Manual Payout Batches / Bank Transfer
↓
M7 — Real Money UI + Money Notifications
```

Current first implementation task after approval:

```text
M1.1 — Commission Settlement Rules + Ledger Foundation
```

M1.1 must not integrate a Payment Gateway, execute Refunds, collect real Bank details, or execute Payouts.

---

# 4. Decisions Still Unresolved

These points remain intentionally unresolved and must not be guessed:

- Final Return Window duration.
- Return Shipping responsibility.
- Whether/when original Shipping is refundable.
- Custom / Made-to-Order return exceptions.
- Any legally required tax / withholding rules.
- First Online Payment Gateway (to be decided at M3 after Payment Core review).

---

# 5. Security Rules for Money

- Browser/Client is not a source of truth for Payment, Commission, Refund, Payout, Tax, Discount or settlement values.
- Financial calculations and transitions must be server/database protected and auditable.
- Sensitive Artisan payout-account data must not be stored in Browser localStorage/sessionStorage in the real implementation.
- Legacy prototype Money UI must not be treated as a financial source of truth.
- Artisan payout-account reads should expose masked values when full values are unnecessary.
- Customer privacy rules remain unchanged; Artisan never receives Customer phone, email, WhatsApp, full address or direct-contact data.

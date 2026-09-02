# IRTH MVP Specification v0.1 — Synchronization Addendum

Sync date: 2026-09-01

This addendum synchronizes the original **IRTH MVP Specification v0.1** with later explicitly approved decisions and verified implementation status. It preserves the historical specification rather than rewriting it. When an older unresolved statement conflicts with a later explicitly approved decision recorded here, the later approved decision is the current one.

## Project principle

**Build simple, but build it correctly.**

IRTH is being built as a real marketplace MVP, not a demo. Product decisions follow: question -> discussion/options -> owner decision -> approval -> implementation. New features remain under MVP Scope Lock.

## Approved architecture

- Next.js
- TypeScript
- Supabase / PostgreSQL
- Modular Monolith
- No Microservices in the MVP

The architecture remains extensible for multiple payment gateways, couriers, countries, currencies, roles, notification channels, advanced search, analytics, integrations, and later Android/iOS apps without prematurely implementing those systems.

## Security and privacy rules

- Artisans must not receive customer phone, email, WhatsApp, full address or direct contact information.
- Browser/client values are not authoritative for price, commission, discounts, inventory, payment, refunds, payouts or order totals.
- Sensitive mutations go through trusted server-side boundaries.
- Sensitive DB logic uses least privilege and auditable operations.
- Draft CMS content must not be exposed through ordinary public APIs.
- Sensitive CMS media remains private and is exposed publicly only through controlled Signed URLs when content is Published.

## Approved Product editing / re-review rule — 2026-09-02

The owner explicitly approved the following rule for Artisan Product management:

- Any Artisan change to the **content of an already Published Product** must return that Product to the Product Approval flow before the changed version can be public again.
- Product content includes names, descriptions, story, material, craft, dimensions, weight, preparation details, product-mode flags/customization, and Product images/video.
- The MVP implementation uses the simple safe behavior: when Published content/media is changed by the Artisan, the Product becomes **Draft** and is temporarily unavailable publicly until the Artisan submits it again and IRTH approves it.
- Product media cannot be changed by the Artisan while a Product publish review is Pending.
- Inventory quantity remains a separate trusted operational update and does not by itself trigger content re-review.
- Published market-price changes continue through the existing Product Market Price Review workflow; the currently approved price remains public until the new price is approved.
- "Delete Product" is implemented as a safe archive/soft-delete boundary so the Product disappears from the Artisan active list and public marketplace while historical Orders, Reviews and financial/audit references remain intact.

This rule is an approved Product/Security decision and must not be silently weakened later.

## Current money decisions

- Artisan sets the customer-facing product price.
- IRTH does not add commission on top of that price.
- Commission is deducted from collected funds.
- Commission supports Craft Default plus optional Artisan Override.
- The applied rate is historically snapshotted on the transaction/order data.
- Payout lifecycle: payment -> IRTH collection -> delivery -> return window end -> eligible -> payout cycle.
- Egypt return window initial default is 14 days and is dynamically configurable by Super Admin; shipment receives a snapshot at first delivery, so later config changes are not retroactive.
- MVP payout operations are manual Super Admin payout batches.
- First payout method is Bank Transfer with Pending Verification -> review -> Active workflow for payout account changes.
- Artisan-funded promotion: artisan bears the discount and commission is calculated after discount.
- IRTH-funded promotion: IRTH bears the discount while artisan entitlement is preserved under the approved funding rule.

Still not approved:

- final Payment Gateway
- tax/withholding types and rates
- return shipping cost responsibility

## Verified closed foundations

As of this sync, the following major foundations are implemented/closed according to their completed technical and functional verification:

- Secure Shopping / Checkout / Orders
- internal Artisan groups and Shipments
- order tracking and fulfillment/shipping foundations
- In-App + Email Notification Foundation
- Money Phase 6 Foundation
- Reviews including verified delivery gating and moderated private review images
- Dynamic Return Window
- Wholesale
- Saved Products / Recently Viewed
- comprehensive Search foundation and approved filters
- trusted Commission Admin
- customer/admin Return UI lifecycle through refund preparation
- trusted Admin Dashboard
- Artisan/Craft/Country admin structure
- Craft Management
- simple Product Customization
- Customer Management

## CMS architecture

Approved MVP CMS remains constrained and safe. It does **not** support arbitrary HTML, JavaScript, CSS, unrestricted blocks, plugins or a free-form Page Builder.

Shared CMS foundation provides:

- Draft / Published separation
- document versions/history
- audit events
- trusted Super Admin mutations
- Published-only public reads

### CMS modules already functionally working/closed

- Homepage CMS
- New Arrivals
- Best Sellers
- Blog (`/blog`), separate from Artisan Stories (`/stories`)
- Brand & Site Assets
- Country CMS
- optional Country Introduction Video: MP4, max 3 minutes, max 250MB, private storage, TUS resumable upload, server-side duration validation
- Homepage Country Published Covers
- Static Pages Foundation

### Static Pages verification

Admin route:

`/dashboard-admin/content/static-pages`

Temporary public route:

`/pages/[slug]`

Browser verification on 2026-09-01 passed:

1. Save Draft.
2. Draft page was not public.
3. Publish.
4. `/pages/about-irth` became public and rendered correctly.

Static Pages Foundation is therefore **FUNCTIONALLY CLOSED**.

The final public URL strategy for static pages, such as `/about` versus `/pages/about`, has not been approved yet.

## Current CMS task order

1. **Help CMS** — current active task.
2. **Contact CMS** — next approved task.
3. Then inspect actual status and continue remaining CMS Blueprint gaps such as Footer, Campaigns, SEO/public metadata improvements and authenticated Super Admin Preview.

Help and Contact are separate modules and must not be merged.

Help MVP should remain simple/manageable rather than becoming a large knowledge-base platform.

## Other unresolved points that must not be invented

- fixed number of Country Cultural Images
- final Static Page public routing strategy
- Payment Gateway
- tax rules/rates
- return shipping responsibility

## Known security debt before Live

- Re-review legacy `public.review_product_market_price_request(...)` SECURITY DEFINER execution exposure to `authenticated`.
- Supabase Auth Leaked Password Protection is currently disabled and must be addressed before Live.
- Existing RLS INFO/performance warnings must be assessed by severity rather than treated automatically as exploitable vulnerabilities.
- A complete Production Readiness / Money Safety Review is required before real Production Launch.

## Synchronization references

- GitHub: `mmesaba7/IRTH`
- branch: `main`
- local project: `C:\Users\new\Desktop\irth`
- Supabase project ref: `vcrsxmdsswgdevbnooni`
- Supabase region: `eu-west-1`

After GitHub Application Code changes, local verification flow remains:

```powershell
cd C:\Users\new\Desktop\irth
git pull
npm.cmd run build
```

Then perform the browser test defined for the current feature.

# IRTH CMS Implementation Status

Last verified: 2026-09-01

This file records the verified implementation state of the IRTH CMS so future work does not rely on assumptions. It is a technical implementation-status companion to `IRTH MVP Specification v0.1`; it does not replace approved product decisions.

## CMS core — CLOSED

Live Supabase uses the shared constrained CMS foundation:

- `private.cms_section_registry`
- `private.cms_documents`
- `private.cms_document_versions`
- `private.cms_audit_events`

Verified trusted boundaries:

- `public.get_published_cms_document(text)` — Published-only read.
- `public.get_admin_cms_document(text, uuid)` — Super Admin/service-role boundary.
- `public.get_admin_cms_section_registry(uuid)` — Super Admin/service-role boundary.
- `public.save_admin_cms_draft(text, text, jsonb, uuid)` — Super Admin/service-role mutation boundary.
- `public.publish_admin_cms_document(text, uuid)` — Super Admin/service-role mutation boundary.

Admin mutation/read RPCs remain unavailable to `anon` and ordinary `authenticated` callers. Draft content is never exposed through the ordinary public reader.

The generic CMS writer already permits the approved MVP content types, including `homepage`, `static_page`, `blog_post`, `campaign`, `footer`, `help`, `contact`, `brand`, and `country_content`.

## Functionally closed CMS modules

### Homepage CMS

- Approved 14-section registry.
- Super Admin show/hide and reorder.
- Draft/Published isolation.
- Public Homepage reads Published only.
- Header + Search remain global layout, not reorderable Homepage sections.
- Browser verification passed.

### New Arrivals

- Uses true product publication chronology via `products.published_at`.
- First publish sets the timestamp.
- Non-published products do not retain a fake publication timestamp.
- Publication chronology behavior verified.

### Best Sellers

Ranks by gross successfully paid quantity per product.

Counted payment statuses:

- `paid`
- `partially_refunded`
- `refunded`

`paid_at` must be present. Refunds do not reduce the ranking score. Tie-break uses latest successful `paid_at`, then product id.

### Blog

- Public route: `/blog`.
- Separate from Artisan Stories at `/stories`.
- Arabic/English title, excerpt and body.
- Slug, cover image, Draft/Published, publish date and SEO basics.
- Private `cms-media` storage with Signed URL publication.
- Browser verification passed.

### Brand & Site Assets

Managed slots:

- Main Logo
- Alternate/Light-Dark Logo
- Favicon
- Default Social Share Image
- Default Placeholder Image

Assets are stored in private `cms-media`; DB stores Asset IDs rather than arbitrary image URLs. Public Logo + Favicon integration is browser verified.

### Country CMS

- Country remains a structural DB entity and stays separate from Market/Currency/Shipping.
- Country content owns bilingual display names, cultural summary, cover, ordered cultural images and SEO basics.
- Public route: `/country/[slug]`.
- Public reads Published only; a safe legacy fallback remains when no CMS content is published.
- Number of Cultural Images is intentionally not fixed because no final product decision exists yet.

Country introduction video is browser verified:

- one optional MP4
- maximum 3 minutes
- maximum 250MB
- private `cms-videos`
- TUS resumable upload
- server-side duration validation
- Draft video is not public
- Published video is resolved through a Signed URL

The Storage policy uses direct `user_roles` + `roles.code = 'super_admin'` authorization. The private helper remains postgres-only.

Homepage Explore Country cards now resolve Published Country CMS Cover only. Countries without one retain the intended dark fallback; no fake default image is invented.

### Static Pages — FUNCTIONALLY CLOSED

Admin route:

- `/dashboard-admin/content/static-pages`

Current temporary public route:

- `/pages/[slug]`

Uses the shared CMS core with:

- `content_type = 'static_page'`
- `document_key = 'page:<slug>'`

Fields:

- slug
- Arabic/English title
- Arabic/English body
- Arabic/English SEO title
- Arabic/English meta description
- canonical URL
- Draft / Publish

Security verification:

- `anon` admin read: denied
- ordinary `authenticated` admin read: denied
- service-role admin read: allowed

Controlled DB test passed: Draft -> not public -> Publish -> public -> rollback.

Browser test passed on 2026-09-01 using `about-irth`:

1. Save Draft succeeded.
2. `/pages/about-irth` was not public while Draft-only.
3. Publish succeeded.
4. `/pages/about-irth` appeared correctly after Publish.

Therefore Static Pages Foundation is functionally closed.

The final public URL strategy (`/about` versus `/pages/about`, etc.) has **not** been approved and must not be silently chosen.

## Current active module

### Help CMS

Help is the next approved CMS module.

Constraints:

- Help remains independent from Contact.
- MVP Help should stay simple/manageable, not become a large knowledge-base platform.
- Reuse the shared CMS Draft/Published/history/audit foundation.
- No arbitrary HTML, scripts, CSS or free-form Page Builder.

## Next approved module

### Contact CMS

Contact follows Help and remains independent. Public IRTH contact content must be distinguished from any future customer support/contact-submission workflow; no sensitive workflow is implied or approved by the CMS content module itself.

## Remaining CMS blueprint after Help + Contact

Inspect actual implementation status before each task, then continue with remaining gaps such as:

- Footer Management
- Campaign / Announcement Banner
- SEO/public metadata improvements
- authenticated Super Admin Preview
- other verified CMS Blueprint gaps

## Known security debt outside the closed CMS modules

Before Production Readiness, re-check:

- legacy `public.review_product_market_price_request(...)` SECURITY DEFINER exposure to `authenticated`;
- Supabase Auth Leaked Password Protection currently disabled;
- existing INFO/RLS performance warnings, distinguishing advisory/performance items from exploitable security problems.

Do not reopen previously fixed Return SECURITY DEFINER findings without evidence.

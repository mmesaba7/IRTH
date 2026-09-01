# IRTH CMS Implementation Status

Last verified: 2026-09-01

This file records the verified implementation state of the IRTH CMS. It is a technical implementation-status companion to `IRTH MVP Specification v0.1`; it does not replace approved product decisions.

## CMS core — CLOSED

Live Supabase uses the shared constrained CMS foundation:

- `private.cms_section_registry`
- `private.cms_documents`
- `private.cms_document_versions`
- `private.cms_audit_events`

Core behavior:

- Draft and Published are separate.
- Ordinary public CMS reads Published only.
- Super Admin CMS writes and privileged reads go through trusted server/RPC boundaries.
- No arbitrary HTML, JavaScript, CSS, plugins or free-form Page Builder in MVP.
- CMS media remains private and public content resolves approved media through controlled URLs.

## Functionally closed / browser-verified CMS modules

### Homepage CMS

- Approved 14-section registry.
- Show/Hide + reorder.
- Draft/Published isolation.
- Header + Search remain global and non-reorderable.
- Homepage Country Covers use Published Country CMS covers.

### New Arrivals

- Uses true product publication chronology via `products.published_at`.

### Best Sellers

- Gross successfully-paid quantity ranking.
- Refund does not reduce score.

### Blog

- Separate `/blog` from Artisan Stories `/stories`.
- Arabic/English content, slug, cover, publish date and SEO basics.
- Private cover media with Published-only public resolution.

### Brand & Site Assets

Managed private media slots:

- Main Logo
- Alternate/Light-Dark Logo
- Favicon
- Default Social Share Image
- Default Placeholder Image

Public Logo/Favicon integration is browser verified.

### Country CMS

- Country remains a structural entity separate from Market/Currency/Shipping.
- Bilingual display content, cultural summary, cover, ordered cultural images and SEO basics.
- Public `/country/[slug]` reads Published CMS content only, with safe legacy fallback where applicable.
- Optional introduction video: MP4, max 3 minutes, max 250MB, private `cms-videos`, TUS upload, server duration validation, Published-only public access.

The number of Cultural Images is still not finalized and must not be invented.

### Static Pages

Admin:

- `/dashboard-admin/content/static-pages`

Temporary public routing:

- `/pages/[slug]`

Draft isolation and Publish browser tests passed.

Final public URL strategy (`/about` vs `/pages/about`, etc.) is not yet approved.

### Help

- Public `/help`.
- Super Admin `/dashboard-admin/content/help`.
- Bilingual title/intro and ordered FAQ items.
- Draft/Publish.
- No large Knowledge Base complexity.

Browser verification passed.

### Contact

- Public `/contact`.
- Super Admin `/dashboard-admin/content/contact`.
- Public IRTH contact content only.
- No customer message submission workflow was invented.
- Draft/Publish.

Browser verification passed.

### Footer

- Super Admin `/dashboard-admin/content/footer`.
- Global Published-only SiteFooter.
- Bilingual labels, groups, URLs, order, show/hide and same/new tab.
- Internal CMS links are validated before publish.
- Legacy duplicate Homepage footer was removed while preserving the Homepage footer section key/schema.

Browser verification passed.

### Campaign / Announcement Hero

- Fixed MVP document key `campaign:main`.
- Active/Inactive.
- Arabic/English title/body.
- Optional CTA and background image.
- Start/End schedule.
- Published campaign can temporarily override the Homepage Hero.
- Normal Hero returns when inactive or outside the schedule window.

Browser verification passed for:

- Draft hidden from public.
- Publish appears publicly.
- Active Off restores normal Hero.
- Future Start does not appear early.
- Live schedule appears at the correct time.

### SEO Basics / Public Metadata

Implemented and browser verified:

- global metadata fallback
- Brand favicon/default social image endpoints
- Blog metadata
- Country metadata
- Static Page metadata
- canonical support
- Open Graph fallback
- Published-only dynamic sitemap

No AI SEO, scoring, keyword automation or advanced Redirect Manager was added.

### Secure Preview

- Super Admin-only Draft preview foundation.
- Ordinary logged-out/public access does not expose Draft.
- Supports controlled preview for the CMS modules currently implemented.

Browser verification passed.

## Content History / Audit — IMPLEMENTED, BROWSER VERIFICATION PENDING

The underlying history foundation already existed in:

- `private.cms_document_versions`
- `private.cms_audit_events`

New read-only Super Admin history surface:

- Admin page: `/dashboard-admin/content/history`
- API: `/api/admin/cms/history`
- RPC: `public.get_admin_cms_history(uuid, text, integer)`

The RPC:

- is `SECURITY DEFINER` with fixed empty `search_path`;
- requires the existing Super Admin authorization helper;
- is not executable by `anon` or ordinary `authenticated` roles;
- is executable by `service_role` only;
- returns recent audit events and version metadata, optionally filtered by CMS document key;
- does not add automatic Restore/Rollback behavior because that product behavior has not been approved.

DB verification passed on 2026-09-01 against `campaign:main`: 7 audit events and 7 stored versions were returned.

Browser verification is the only remaining closure step for this module.

## CMS Blueprint status

Approved CMS modules from the project blueprint are now implemented or browser-verified, with Content History/Audit awaiting its final browser test.

After History/Audit passes browser verification, the CMS / Content Manager phase can be treated as functionally closed and the project should move to the final MVP Testing / Production Readiness / Polish stage rather than adding unapproved CMS features.

## Known security / production-readiness debt

Before Live, re-check:

- legacy `public.review_product_market_price_request(...)` SECURITY DEFINER exposure to `authenticated`;
- Supabase Auth Leaked Password Protection disabled;
- existing RLS performance / multiple permissive policy warnings;
- public Published-read SECURITY DEFINER CMS RPCs for least-privilege posture;
- production email sender domain verification;
- final Production Readiness / Money Safety Review before real money operations.

Do not reopen already-fixed findings without evidence.

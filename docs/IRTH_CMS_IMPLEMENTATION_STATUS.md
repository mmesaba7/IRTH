# IRTH CMS Implementation Status

Last verified: 2026-09-01

This file records the verified implementation state of the IRTH CMS so future work does not rely on assumptions.

## Verified implemented

### CMS database foundation

Live Supabase contains:

- `private.cms_section_registry`
- `private.cms_documents`
- `private.cms_document_versions`
- `private.cms_audit_events`

The Homepage document is seeded with the approved 14-section registry.

### CMS server boundaries

Verified functions include:

- `public.get_published_cms_document(text)` — public read of Published content only.
- `public.get_admin_cms_document(text, uuid)` — service-role/Super Admin boundary.
- `public.get_admin_cms_section_registry(uuid)` — service-role/Super Admin boundary.
- `public.save_admin_cms_draft(text, text, jsonb, uuid)` — service-role/Super Admin boundary.
- `public.publish_admin_cms_document(text, uuid)` — service-role/Super Admin boundary.

Admin mutation RPCs are not exposed directly to `anon` or `authenticated`.

### Homepage CMS Admin API

Implemented path:

`src/app/api/admin/cms/homepage/route.ts`

Route:

`/api/admin/cms/homepage`

It supports:

- GET: load current Homepage CMS document + section registry.
- PATCH: validate and save a Draft section configuration.
- POST: Publish the current Draft.
- Same-origin mutation protection.
- Super Admin enforcement through server-only privileged Supabase access.

### Homepage CMS Dashboard

Implemented path:

`src/app/dashboard-admin/content/homepage/page.tsx`

Route:

`/dashboard-admin/content/homepage`

It supports:

- section reorder
- section show/hide
- Save Draft
- Publish
- display of Draft revision / Published revision / visible section count

### Public Homepage Published integration

Implemented in:

`src/app/page.tsx`

The public Homepage now:

- reads `public.get_published_cms_document('homepage')` only;
- never reads the Draft payload;
- applies Published `visible` flags;
- applies Published section ordering;
- validates the Published section payload before using it;
- falls back to the approved default section order if the CMS read/payload is unavailable or invalid, so a CMS fault does not take down the marketplace Homepage.

Currently wired visitor-facing section keys:

- `hero`
- `crafts`
- `explore_countries`
- `featured_products`
- `featured_artisans`
- `promotions`
- `recently_viewed`
- `story_brand`
- `wholesale_cta`
- `trust_value`
- `footer`

The following approved slots intentionally remain without fake/duplicated content until their trusted modules are implemented:

- `best_sellers`
- `new_arrivals`
- `blog_highlights`

Search and Header remain global Homepage layout elements rather than reorderable CMS sections.

## Verified current live state

At verification time:

- Homepage Draft revision: `2`
- Homepage Published revision: `1`
- Draft and Published are correctly separate.
- A Draft reorder exists while Published remains unchanged, proving the Draft isolation flow.
- Public published RPC returns Published revision 1.

The application-code integration commit still requires local build/browser verification before this Homepage CMS integration is considered functionally closed.

## Correction note

A previous review incorrectly stated that the Homepage CMS API and Dashboard page were missing. The review searched the wrong API path (`/api/admin/content/homepage`). The actual implemented API path is `/api/admin/cms/homepage`.

No CMS implementation was lost; the statement was the error.

## Next verification

Run the local build, then perform a controlled browser test:

1. Confirm current public Homepage follows Published revision 1, not Draft revision 2.
2. In the CMS Dashboard, change a section order or visibility and Save Draft only.
3. Confirm public Homepage remains unchanged.
4. Publish.
5. Confirm public Homepage now reflects the published change.
6. Restore the intended published configuration after the test if the test change was temporary.

After that, continue with the next CMS content/data modules rather than duplicating placeholder content.

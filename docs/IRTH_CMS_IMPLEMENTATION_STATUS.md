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

## Verified current live state

At verification time:

- Homepage Draft revision: `2`
- Homepage Published revision: `1`
- Draft and Published are correctly separate.
- A Draft reorder exists while Published remains unchanged, proving the Draft isolation flow.
- Public published RPC returns Published revision 1.

## Correction note

A previous review incorrectly stated that the Homepage CMS API and Dashboard page were missing. The review searched the wrong API path (`/api/admin/content/homepage`). The actual implemented API path is `/api/admin/cms/homepage`.

No CMS implementation was lost; the statement was the error.

## Actual next gap

The real remaining Homepage CMS integration gap is:

**The public Homepage (`src/app/page.tsx`) does not yet consume `public.get_published_cms_document('homepage')` to control the public section visibility/order.**

Therefore:

- Save Draft works and remains private.
- Publish works at the CMS data layer.
- The public Homepage still needs to render from the Published section configuration before CMS reorder/show-hide can affect the visitor-facing page.

This is the next implementation task.

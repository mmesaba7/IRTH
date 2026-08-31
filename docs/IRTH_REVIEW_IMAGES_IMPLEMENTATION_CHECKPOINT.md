# IRTH Review Images Implementation Checkpoint

Status: implemented in GitHub + live Supabase; awaiting local build and browser E2E before closure.

## Approved MVP limits
- Maximum 4 images per Review.
- Maximum 5 MB per image.
- JPEG / PNG / WebP only.
- Private Storage only.
- Images do not appear publicly until IRTH approval.

## Architecture
- Private Supabase Storage bucket: `review-media`.
- Browser receives a short signed upload permission only after server ownership checks.
- `upload-intent` checks Review ownership, pending-review state, MIME, size, and current image count.
- `finalize` re-reads the uploaded object from Storage, verifies server-side size and MIME, validates JPEG/PNG/WebP file signatures, then calls a service-role-only DB RPC.
- DB serializes finalize operations on the Review row and enforces maximum 4 images even under concurrent uploads.
- Review text moderation and image moderation are independent.
- Public Product Review API returns only images whose Review is `published` and whose image status is `approved`, using short-lived signed URLs. Storage paths are not returned to the browser.
- Customer/Guest owner preview uses short-lived signed URLs while the Review is pending.

## Guest privacy
- Guest credential continues to be carried in the URL fragment and removed from the browser URL after page load.
- Review media server boundaries use the hashed guest credential for ownership checks.

## Database migrations
- `20260831194530_create_review_media_upload_and_moderation_foundation.sql`
- `20260831195121_serialize_review_media_limit.sql`

## Security / performance postflight
- `review-media` bucket verified private with 5 MB bucket limit and only JPEG/PNG/WebP MIME types.
- New Review Media RPCs are not executable by `anon` or `authenticated`; service-role boundary only.
- Security Advisor shows no new Review Media warning; remaining warnings are pre-existing tracked debt.
- Performance Advisor shows no new missing FK index from Review Media work.
- Controlled SQL mutation test could not be completed because the connected SQL tool blocked the second rollback-safe mutation script; verification confirmed zero test Review rows and zero test media rows were left behind. Browser E2E remains required before closure.

## Required before closure
1. Local `npm.cmd run build`.
2. Browser E2E: create Verified Review, upload allowed image, verify customer pending preview, verify Admin image moderation, approve Review + image, confirm Product page displays image.
3. Negative browser tests: fifth image, >5 MB, unsupported type, and non-owner access where practical.

# IRTH R1 Reviews Closure

**Project:** IRTH  
**Module:** R1 — Verified Purchase Reviews  
**Status:** CLOSED at current Pre-Live MVP stage  
**Date:** 31 August 2026

---

## 1. Scope implemented

R1 replaces the previous localStorage review prototype with a trusted database/server-backed flow.

Implemented business rules:

- One Review per **Order Item**, regardless of quantity.
- A later separate Order Item for the same product may create another Review.
- Review requires a real IRTH Order Item whose Artisan Shipment is delivered.
- Authenticated customer ownership and Guest-order ownership are verified server-side.
- Product rating and Artisan rating are separate.
- Review text is moderated by IRTH before public display.
- Customer may edit the Review once only.
- Editing returns the Review to `pending_review`.
- Artisan may reply only to a published Review belonging to that Artisan.
- Artisan reply remains hidden until IRTH approval.
- Artisan review dashboard does not expose customer email, phone, address, WhatsApp, customer user ID, or other direct-contact PII.

Review-image limits approved by owner and implemented:

- maximum 4 images per Review;
- maximum 5 MB per image;
- JPEG / PNG / WebP only;
- private Supabase Storage bucket `review-media`;
- image moderation is independent from Review-text moderation;
- only `approved` images belonging to a `published` Review are exposed to the Product Page;
- public image delivery uses short-lived Signed URLs rather than a public bucket.

---

## 2. Architecture / security boundary

Active path:

```text
Browser
→ Next.js Review API
→ server-side Supabase privileged client
→ narrow service-role RPC
→ private Review tables
```

The browser is not granted direct execution of sensitive Review write/moderation RPCs.

Private tables:

```text
private.customer_reviews
private.review_events
private.review_artisan_replies
private.review_media
```

Review media path:

```text
Customer / Guest Review owner
→ server-authorized upload intent
→ private review-media bucket
→ server finalize
→ re-check ownership + state + MIME + size + path + count
→ private.review_media pending_review
→ Super Admin moderation
→ approved image eligible for Signed URL on published Review
```

The finalize path is serialized on the Review row to prevent concurrent uploads from bypassing the four-image limit.

The finalize API additionally checks image file signatures for JPEG / PNG / WebP rather than trusting filename/extension alone.

---

## 3. Production build verification

Local production build passed after Review Images integration:

```text
✓ Compiled successfully
✓ TypeScript passed
✓ Static generation 69/69
```

Relevant routes were present in the successful build, including:

```text
/api/reviews/customer
/api/reviews/media
/api/reviews/media/upload-intent
/api/reviews/media/finalize
/api/reviews/product/[slug]
/api/admin/reviews
/api/artisan/reviews
/product/[slug]/review
/artisan/reviews
/dashboard-admin/reviews
```

---

## 4. Browser E2E — PASSED

A real delivered Order Item was used:

```text
Order: IRTH-20260830-782EBA88
Product: Clay Vessel
Order Item: 9544b20c-f354-4e62-bbe1-755a167aac79
```

Verified Browser E2E:

```text
Delivered purchase
→ Review page opened as Verified Purchase
→ Product rating 4 / Artisan rating 5
→ Review submitted
→ DB status pending_review
→ customer used the one allowed Review edit
→ image uploaded to private Storage
→ image DB status pending_review
→ Super Admin saw private image through authorized Signed URL
→ Review text approved
→ image independently approved
→ Review appeared on Product Page
→ approved image appeared on Product Page
→ Artisan saw published Review without customer PII
→ Artisan reply submitted
→ reply DB status pending_review
→ Super Admin approved reply
→ approved Artisan reply appeared publicly under the Review
```

Final tested record state after all rollback-safe negative tests:

```text
Review status = published
Review edit_count = 1
Review media count = 1
Review media status = approved
Artisan reply status = approved
```

---

## 5. Negative / abuse tests — PASSED

### Review rules

- Attempt second Review for the same Order Item → rejected with `review_already_exists_for_order_item`.
- Attempt Review for an Order Item whose Shipment is not delivered → rejected with `review_requires_delivery`.
- Attempt second customer edit after the single allowed edit → rejected with `review_edit_limit_reached`.
- Wrong customer identity attempting to read Review context → returned no Review context.
- Wrong Artisan requester attempting to read Artisan Review dashboard → rejected with access denied.
- Non-Super-Admin user ID attempting Review moderation → rejected with `admin_required`.

### Review image rules

Controlled transaction tests temporarily moved the tested Review to the required pending state and automatically rolled back on the expected failure.

- Existing image + three additional media finalize calls reached four images; fifth finalize → rejected with `review_media_limit_reached`.
- Unsupported GIF MIME → rejected with `invalid_review_media_type`.
- Oversize 6,000,000-byte image metadata → rejected with `invalid_review_media_size`.
- Pending Review image → absent from public Review-media read model.
- Rejected Review image → absent from public Review-media read model.
- Pending Review text → absent from public published-Review read model.
- Rejected Review text → absent from public published-Review read model.
- After rollback tests, original published/approved state remained unchanged.

### Direct RPC execution boundary

Verified database privileges:

```text
anon          create_verified_purchase_review = false
authenticated create_verified_purchase_review = false
anon          finalize_review_media            = false
authenticated finalize_review_media            = false
anon          review_customer_review           = false
authenticated review_customer_review           = false
```

### Storage privacy

Verified live bucket configuration:

```text
bucket = review-media
public = false
file_size_limit = 5 MB
allowed MIME = image/jpeg, image/png, image/webp
```

---

## 6. Test-evidence distinction

The following were exercised end-to-end in the local Browser and live development Supabase project:

- authenticated Verified Purchase Review submission;
- one allowed Review edit;
- normal JPEG upload;
- private image visibility for Admin;
- Review moderation;
- image moderation;
- public Review/image display;
- Artisan reply submission/moderation/public display.

The following hostile-input protection is implemented and code-reviewed, but was not injected directly against the owner's `localhost` from the connected tools because the tool environment cannot call the owner's local web server:

- deliberately forged non-image bytes sent with an allowed image MIME to exercise the file-signature rejection branch through HTTP;
- explicit cross-origin HTTP mutation injection against localhost.

These protections are present in the server routes and passed TypeScript/production build. They should be included again in the final Phase 7 security/browser QA checklist rather than falsely recorded as direct localhost runtime attacks here.

---

## 7. Advisor status

R1 / Review Media introduced no new specific Security Advisor warning after postflight review.

Existing project-level security debt remains tracked separately, including:

- legacy authenticated-executable `public.review_product_market_price_request(...)`;
- selected guarded Return SECURITY DEFINER notices;
- Supabase Auth Leaked Password Protection disabled;
- existing RLS-enabled/no-policy INFO items.

These are not R1 regressions.

---

## 8. R1 closure decision

At the current **Pre-Live MVP stage**, R1 Reviews is closed.

Closure means the approved MVP Review business rules, trusted backend, privacy boundaries, moderation workflow, Review images, Browser happy path, and core DB negative/authorization tests are implemented and verified.

Closure does not waive the final Phase 7 hostile HTTP/browser security pass before production launch.

Next planned sequence after R1:

```text
Return Window dynamic + shipment snapshot E2E / reconciliation
→ Wholesale E2E
→ remaining MVP gap audit
→ Phase 7 Testing & Polish
```

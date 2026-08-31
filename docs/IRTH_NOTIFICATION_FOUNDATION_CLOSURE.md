# IRTH Notification Foundation Closure

**Project:** IRTH  
**Module:** Notification System v0.1  
**Status:** CLOSED ✅  
**Closed:** 31 August 2026

---

# 1. Scope

This closure covers the MVP Notification Foundation required by **IRTH MVP Specification v0.1**:

- In-App Notifications.
- Email notifications for important events.
- Independent Notification Layer.
- Customer, Artisan and Super Admin notification boundaries.
- Real Notification Center and unread badge.
- Retryable email delivery through the first provider adapter.

Deferred channels remain outside MVP implementation for now:

```text
SMS
WhatsApp
Push
```

The architecture is prepared to add them later without coupling Order, Shipping or Payment logic to a specific channel.

---

# 2. Approved Architecture

```text
Domain Event
    ↓
Notification Layer
    ├── In-App Notification
    └── Email Outbox
            ↓
       Email Processor
            ↓
       Provider Adapter
            ↓
          Resend
```

Rules:

- Domains emit events; they do not directly own email transport.
- Email failure must not roll back an Order or change Order Status.
- In-App data and email delivery are deduplicated.
- Direct Browser access to notification storage is not trusted.
- Notification links are restricted to safe internal paths.
- Payment, Shipping and Notification remain separate layers.

---

# 3. N1 — Notification Database + Security Foundation — CLOSED ✅

Migration:

```text
supabase/migrations/20260831114954_create_notification_foundation.sql
```

Implemented:

- `public.notifications` for persistent In-App notifications.
- Bilingual Arabic / English title and body fields.
- `read_at` unread/read state.
- Safe internal `link_path` validation.
- Source metadata and unique deduplication key.
- `private.notification_email_outbox` for asynchronous email delivery.
- Secure private emit / enqueue boundaries.
- Authenticated ownership-scoped RPCs for reading and marking notifications.
- Direct anonymous/authenticated table access revoked.

Verified DB behavior:

- Duplicate In-App event creates one notification.
- Duplicate email enqueue creates one outbox item.
- Customer can read only their own notification feed.
- Customer cannot mark another user's notification as read.
- Customer can mark their own notification as read.
- Private emit/email functions are not executable by authenticated Browser users.

---

# 4. N2 — Domain Event Wiring — CLOSED ✅

Migrations:

```text
supabase/migrations/20260831115532_wire_order_shipping_notifications.sql
supabase/migrations/20260831120010_wire_product_moderation_notifications.sql
```

Notification wiring uses existing audited domain history instead of duplicating Order / Shipping business logic.

Implemented current real events include:

## Customer

- Order created.
- Order confirmed.
- Preparing.
- Ready for courier pickup.
- Picked up from artisan.
- In transit.
- Delivered.
- Delivery failed.
- Cancelled.
- Returned.
- Tracking metadata update.

Registered customers receive In-App + Email for applicable events.
Guest customers receive Email only.

## Artisan

Current implemented events include:

- New Order.
- Product approved.
- Product rejected.

Additional Specification events will be wired when their owning domain modules become real, such as Payment, Returns, Payouts and additional moderation workflows.

## Super Admin

Current implemented New Order event creates an In-App notification.
Critical Admin Email remains event-dependent and is not artificially generated before its domain event exists.

Verified wiring behavior included registered Customer, Guest Customer, Artisan and Super Admin fan-out plus deduplication.

---

# 5. N3 — Real Notification Center — CLOSED ✅

Application files:

```text
src/lib/notifications.ts
src/app/components/NotificationBell.tsx
src/app/notifications/page.tsx
src/app/components/Header.tsx
```

Implemented:

- Replaced the previous localStorage notification prototype.
- `/notifications` reads the secure real notification feed.
- Header unread badge is DB-backed.
- Mark one as read.
- Mark all as read.
- Notification ownership remains enforced by the database boundary.

Browser E2E verified a real temporary notification and confirmed `read_at` changed in PostgreSQL.

---

# 6. N4 — Resend Email Transport — CLOSED ✅

Migration:

```text
supabase/migrations/20260831121510_add_notification_email_outbox_worker_boundary.sql
```

Application files:

```text
src/lib/guestTrackingToken.ts
src/lib/notifications/emailTemplate.ts
src/lib/notifications/resendEmailProvider.ts
src/lib/notifications/processEmailOutbox.ts
src/app/api/internal/notifications/email/process/route.ts
src/app/api/orders/route.ts
```

Implemented:

- Provider-independent email processing boundary.
- First MVP provider adapter: Resend.
- Direct HTTPS API integration; no provider SDK coupling required.
- Email Outbox claim using database locking / `SKIP LOCKED`.
- Stale-processing recovery.
- Retryable failed delivery with bounded attempts and backoff.
- Provider message id persisted after success.
- Resend request idempotency uses the outbox dedupe key.
- Processor route protected by a private Bearer secret.
- Processor response is `no-store` and does not expose secrets.
- Email provider errors do not change Order Status.
- Arabic / English templates supported.
- Current Egypt MVP `auto` locale resolves to Arabic.

Required server environment configuration:

```text
RESEND_API_KEY
IRTH_EMAIL_FROM
IRTH_APP_URL
IRTH_EMAIL_PROCESSOR_SECRET
IRTH_GUEST_TRACKING_SECRET
```

Secrets must remain server-side and must never be committed to Git or exposed to Browser code.

---

# 7. Guest Tracking Email Security

Guest email links preserve the secure Guest Tracking model.

For a Guest Order:

```text
Order context
    ↓
Server-only deterministic Guest token generation
    ↓
Email link fragment
    ↓
/track/[orderNumber]#access=...
```

Security properties:

- Raw Guest token is never stored in PostgreSQL.
- Raw Guest token is never written to the email outbox payload.
- Raw Guest token is generated only when the worker renders the email.
- The tracking page captures the fragment and removes it from visible URL/history.
- Order Number alone is not authorization.

The email provider necessarily receives the rendered email content during delivery. Production provider/domain configuration must therefore be treated as part of the trusted email transport boundary.

Production recommendation: keep click tracking disabled for transactional Guest Tracking credential links unless a dedicated security review explicitly approves otherwise.

---

# 8. Email Transport E2E — PASSED ✅

Controlled test flow:

```text
private.notification_email_outbox
        ↓
pending
        ↓
IRTH email processor
        ↓
Resend API
        ↓
sent
```

First real external-recipient attempt correctly exercised the failure path and was recorded as a provider validation failure rather than incorrectly marking the email as sent.

A controlled Resend test-recipient run then succeeded:

```text
claimed = 1
sent    = 1
failed  = 0
```

Live DB verification after success:

```text
status                  = sent
attempts                = 1
provider                = resend
provider_message_id     = present
sent_at                 = present
last_error              = null
```

The controlled email test row was deleted after evidence was captured.

This verifies the full technical path:

```text
Notification Email Outbox
→ Worker Claim
→ Template Render
→ Provider Adapter
→ Resend
→ Successful Finalization
```

---

# 9. Production Build Gate — PASSED ✅

After N4 implementation, the project production build passed with Next.js / TypeScript and included:

```text
/api/internal/notifications/email/process
```

No Notification-specific production build blocker remains.

---

# 10. Final Security Review

Final Supabase Security Advisor after Notification DDL shows no new Notification-specific WARN vulnerability.

Expected informational notices:

- `public.notifications` has RLS enabled with no direct policies because direct Browser table access is intentionally denied and access is through secure RPC boundaries.
- Existing audit history tables use the same intentional deny-direct-access pattern.

Known pre-existing warnings remain outside this Notification module closure:

1. `public.review_product_market_price_request(...)` authenticated-executable SECURITY DEFINER warning.
2. Supabase Leaked Password Protection disabled.

These are tracked technical/security debt and are not caused by the Notification module.

---

# 11. Edge Cases Reviewed

- Duplicate domain event.
- Duplicate email enqueue.
- Worker concurrency claim boundary.
- Worker stale lock recovery.
- Provider failure.
- Provider success.
- Retry scheduling.
- Missing provider/app configuration fails safely.
- Unauthorized email processor request rejected.
- Registered Customer vs Guest Customer delivery behavior.
- Guest token not persisted in outbox/DB.
- Safe internal notification links.
- Email failure independent from Order lifecycle.

---

# 12. Production Configuration Still Required

This is configuration, not unfinished Notification architecture.

Before real production customer email delivery:

- Acquire/use an IRTH-controlled domain.
- Verify the sending domain with Resend.
- Replace the Resend development sender with the approved IRTH sender address.
- Configure production `IRTH_APP_URL`.
- Store all production secrets in the deployment environment.
- Review domain-level email tracking settings; keep click tracking disabled for Guest credential links unless separately approved.

The exact production domain/sender identity has not been approved yet.

---

# 13. Deferred Notification Events

The Specification contains events whose owning modules are not yet implemented.
They are not fabricated inside Notifications.

Examples include:

- Payment confirmation / payment problem.
- Return request / detailed refund lifecycle.
- Artisan dues / payout events.
- Payout-data changes.
- Additional artisan/account moderation events.
- Wholesale / Custom events.
- Restock notifications.

Rule:

```text
Build owning domain event first
        ↓
Emit through existing Notification Layer
```

This is intentional architecture, not a missing Notification foundation.

---

# 14. Final Closure Decision

Notification System v0.1 satisfies the current MVP foundation requirements and the project Definition of Closed:

1. Business rule understood ✅
2. Required decisions approved ✅
3. Implementation exists ✅
4. Security reviewed ✅
5. Expected flows tested ✅
6. Relevant edge cases reviewed ✅
7. No Notification-specific blocker remains ✅
8. Production build passed ✅
9. Closure documentation created ✅
10. Git / Live Supabase implementation state reconciled for the module ✅

Therefore:

```text
N1 Notification Database + Security       ✅ CLOSED
N2 Domain Notification Wiring             ✅ CLOSED
N3 Real Notification Center               ✅ CLOSED
N4 Resend Email Transport                 ✅ CLOSED

NOTIFICATION FOUNDATION                   ✅ CLOSED
```

Next project position should return to the Specification implementation roadmap and review the remaining **Phase 6 — Money** work before implementation. Existing Commission, Promotions and Coupons foundations must be reused rather than rebuilt.

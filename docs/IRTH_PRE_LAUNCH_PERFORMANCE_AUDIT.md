# IRTH Pre-Launch Performance Audit

**Project:** IRTH  
**Status:** OPEN — required before Production Go-Live  
**Classification:** 🟢 MVP / Launch Readiness  
**Evidence checkpoint:** `819e60e`  
**Purpose:** Preserve the performance issues observed in the current implementation, distinguish verified code findings from hypotheses, and define safe remediation directions without changing approved business rules.

---

# 1. Rule

Performance work must preserve IRTH correctness, privacy, security, pricing, market-selection, promotion, inventory, order, payment, and authorization rules.

Do not optimize by weakening server-authoritative business logic or by caching user-sensitive / financial state incorrectly.

Measure before and after changes. Do not assume Supabase, Vercel, RLS, SQL indexes, the user's laptop, or network are the bottleneck without timing evidence.

---

# 2. Verified Findings from Current Code

## P1 — Homepage is a large Client Component

**Evidence:** `src/app/page.tsx` starts with `"use client"` and loads core marketplace data inside `useEffect`.

**Why it can hurt:** the browser must receive/run client JavaScript before the main homepage data-loading workflow starts. A large interactive component also increases hydration/client work.

**Logical remediation:**

- During the performance pass, evaluate moving public, non-user-specific homepage data fetching to Server Components / server-side data access.
- Keep only genuinely interactive pieces as Client Components.
- Do not perform a large rewrite blindly; split incrementally and measure the result.

**Target:** meaningful homepage content should be available as early as possible, with interactive features hydrating separately.

---

## P2 — Homepage data-fetch dependency chain / waterfall

**Evidence:** homepage first awaits `/api/market-selection`. Only after that does it start the main `Promise.all` for countries, crafts, artisans, products, promotions and CMS. If promotions exist, `/api/cart/quote` can run afterward.

Current shape:

```text
market selection
↓
main parallel data group
↓
optional secure promotion quote
↓
final mapped state / render
```

**Why it can hurt:** parallel requests are useful, but sequential dependency stages add their latency together.

**Logical remediation:**

- Identify which requests truly depend on selected market and which can start immediately.
- Start independent work in parallel.
- Consider resolving market context once at the server/request boundary and passing it to dependent sections.
- Keep secure promotion pricing/quote server-authoritative; do not replace trusted quote logic with client-calculated discounts merely for speed.

**Target:** remove unnecessary sequential waits while preserving trusted pricing.

---

## P3 — Duplicate market-selection work

**Evidence:** homepage requests `/api/market-selection`; `MarketSelector` also requests `/api/market-selection` when it mounts.

**Why it can hurt:** duplicate network/server work occurs during the same page experience.

**Logical remediation:**

- Resolve market context once where practical.
- Share/pass initial market state to consumers rather than independently refetching the same value on initial load.
- Retain an explicit refresh/revalidation path after the customer changes market.

**Target:** one authoritative initial market resolution per page/request flow where possible.

---

## P4 — Homepage products query has no database limit

**Evidence:** homepage queries all `published` products ordered by `created_at`, then maps/filter them in the browser. Later the UI selects only a small subset, including `products.slice(0, 6)`.

**Why it can hurt:** data transfer and browser processing can grow with the entire published catalog even though the homepage displays only a small number.

**Logical remediation:**

- Query only the number of rows needed for each homepage section, with a small justified buffer only where post-query eligibility filtering requires it.
- Prefer database/server filtering for conditions that can safely be expressed there.
- Use pagination/cursor-based loading on catalog surfaces that genuinely need many products.
- Verify that limiting does not accidentally hide eligible products because artisan/craft/market eligibility is currently applied later in the flow.

**Target:** homepage data cost should not scale linearly with the entire product catalog.

---

## P5 — Heavy use of `cache: "no-store"` on public-ish reads

**Evidence:** current homepage/market/CMS flows contain multiple requests explicitly configured with `cache: "no-store"`.

**Why it can hurt:** every load must re-request/recompute data instead of benefiting from an appropriate cache/revalidation strategy.

**Logical remediation:**

- Audit each `no-store` individually; do NOT remove it globally.
- Keep dynamic, user-specific, security-sensitive or correctness-critical state uncached where necessary.
- For public content such as stable CMS/public catalog metadata, evaluate safe Next.js caching/revalidation after measuring freshness requirements.
- Define invalidation/revalidation when Admin publishes content rather than serving stale data indefinitely.

**Target:** cache only data whose correctness and privacy semantics allow it.

---

## P6 — Header and MarketSelector add startup requests

**Evidence:** Header performs auth/user classification work and fetches `/api/cms/brand`. MarketSelector starts `/api/markets`, `/api/market-selection`, and `/api/market-suggestion` in parallel.

**Why it can hurt:** global UI adds several network/server/database operations to page startup, including work that overlaps with homepage market resolution.

**Logical remediation:**

- Deduplicate shared market context.
- Evaluate passing stable brand/public configuration from server/layout rather than refetching it independently on every client mount.
- Keep authentication/authorization correctness intact; do not replace trusted auth checks with localStorage/client assumptions.
- Lazy-load only genuinely non-critical global features where doing so improves measured UX without hiding important state.

**Target:** global navigation should not create avoidable repeated startup work.

---

# 3. Things NOT Yet Proven

The following must NOT be presented as causes until measured:

- Supabase itself is slow.
- RLS is causing the slowdown.
- Missing PostgreSQL indexes are causing the slowdown.
- Vercel cold starts are the primary cause.
- The user's laptop is the primary cause.
- Internet latency is the primary cause.
- Repository LOC / total code size is the primary cause.

These are possible investigation areas, not approved diagnoses.

---

# 4. Required Measurement Plan Before Optimization

Compare the same critical journeys under controlled conditions:

1. Local `next dev` — useful for development experience only; do not treat it as production performance.
2. Local production build (`next build` + production start).
3. Hosted Vercel production/preview deployment connected to the intended Supabase environment.

Measure at minimum:

- initial document/server response timing;
- number of network requests;
- duplicated requests;
- slowest API/Supabase calls;
- transferred JavaScript/data size;
- time until useful homepage content appears;
- image/media loading behavior;
- key Web Vitals / browser performance traces where available.

Critical journeys:

```text
Homepage
→ Shop / Search
→ Product Detail
→ Cart
→ Checkout
→ Order / Tracking
```

Also inspect Account/Admin/Artisan dashboards separately because their performance characteristics and security constraints differ from public storefront pages.

---

# 5. Recommended Fix Order

Do not optimize everything at once.

```text
1. Establish production-like baseline measurements
2. Remove duplicate initial market-selection request/work
3. Bound homepage product queries and payload sizes safely
4. Break unnecessary homepage request waterfalls
5. Review public-data caching / revalidation case-by-case
6. Reduce unnecessary global Header / MarketSelector startup work
7. Split large Client Components where measurements justify it
8. Re-measure
9. Only then investigate DB indexes / RLS / infrastructure if timings point there
10. Image/media optimization pass based on measured payload and rendering cost
```

---

# 6. Acceptance Principle

This audit is not closed because code was refactored. It closes only after production-like measurement shows that the critical customer journeys are acceptably responsive and no approved IRTH business/security rule was weakened.

Exact performance budgets/thresholds have not yet been approved. They should be selected from real measurements during the Pre-Launch Performance Pass rather than invented here.

---

# 7. Scope

This is not a new product feature and does not reopen approved MVP decisions.

Classification:

```text
🟢 MVP / Launch Readiness
```

Reason: storefront responsiveness directly affects the usability of the real MVP and should be reviewed before Go-Live.

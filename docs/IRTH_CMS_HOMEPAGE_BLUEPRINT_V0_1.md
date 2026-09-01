# IRTH CMS — Homepage Blueprint v0.1

Status: APPROVED FOUNDATION

## Goal
Build a constrained, secure, bilingual Homepage CMS for IRTH without introducing a free-form page builder.

The Super Admin can manage homepage content, visibility, ordering and publishing from the Dashboard. Business data such as Products, Crafts, Countries, Artisans and Promotions remains sourced from trusted marketplace tables and is referenced by IDs rather than duplicated as free text.

## Approved Homepage Sections

1. Hero
2. Crafts
3. Explore Countries
4. Featured Products
5. Best Sellers
6. New Arrivals
7. Featured Artisans
8. Promotions
9. Recently Viewed
10. Story / Brand
11. Wholesale CTA
12. Blog Highlights
13. Trust / Value
14. Footer

Header and Search are global layout/navigation elements and are not reorderable homepage sections.

## Super Admin Controls

For homepage sections where applicable:
- Show / Hide
- Reorder sections
- Arabic + English content
- Draft / Published state
- Preview before Publish
- CTA label + destination
- Images managed through controlled media references
- Selection of Products / Crafts / Countries / Artisans by database ID

The CMS must not permit arbitrary HTML, arbitrary JavaScript, arbitrary CSS, or unrestricted page-builder blocks in MVP.

## Section Data Rules

### Hero
CMS-managed bilingual eyebrow/title/body, image, one or two CTAs.
A temporary Campaign may override the normal Hero for a defined start/end window without deleting the default Hero.

### Crafts
Marketplace-backed. Super Admin may choose featured Crafts and ordering. References use Craft IDs.

### Explore Countries
Marketplace-backed. Super Admin may choose Countries and ordering. Country cultural content belongs to the Country content domain, not duplicated inside Homepage CMS.

### Featured Products
Manual Super Admin selection by Product IDs. Only eligible published products may render publicly.

### Best Sellers
Automatic from trusted completed/delivered marketplace sales data. CMS controls section text, visibility and display count, not fabricated sales ranking.

### New Arrivals
Automatic from eligible published product creation/publication chronology. CMS controls section text, visibility and display count.

### Featured Artisans
Manual Super Admin selection by Artisan IDs. Public rendering requires currently eligible active Artisan state.

### Promotions
Automatic from active approved Promotions and trusted pricing/promotion rules. CMS controls presentation text, visibility and display count. CMS must never calculate discount money independently.

### Recently Viewed
Personalized from the existing Recently Viewed persistence layer. CMS controls section label and visibility only; customer history remains per-user/per-guest discovery data.

### Story / Brand
CMS-managed bilingual story text, image and CTA.

### Wholesale CTA
CMS-managed bilingual title/body/image/CTA. CTA should normally point to the approved Wholesale flow.

### Blog Highlights
Marketplace Blog-backed. Supports automatic latest/featured article selection plus configurable display count once Blog domain is implemented.

### Trust / Value
CMS-managed constrained cards/items for approved trust/value messages. No arbitrary block design.

### Footer
Footer is CMS-managed rather than hardcoded. Super Admin can manage grouped links, order, visibility, bilingual labels and internal/external destinations. Help and Contact remain independent destinations/content areas and are not removed or merged.

## Global CMS Domains Approved Alongside Homepage

- Countries Content
- Static Pages
- Blog
- Help
- Contact
- Footer
- Campaigns / Announcement Banner
- Brand & Site Assets
- SEO Basics
- Content History / Audit
- Preview / Publish

## Brand & Site Assets

Super Admin-managed central assets include at minimum:
- Main logo
- Optional light/dark logo variants when the UI requires them
- Favicon
- Default social-share image
- Default placeholder image

Brand assets are centralized; pages do not upload independent replacement logos.

## Campaigns

Campaigns are temporary and separate from permanent homepage content.
MVP supports:
- Announcement/banner content
- Arabic + English
- optional image
- CTA
- start_at / end_at
- active state
- optional temporary Hero override

Expired campaigns stop rendering automatically without destroying normal homepage content.

## Footer Links

Footer links are data-driven through the Super Admin Dashboard, not hardcoded.
Each link supports:
- Arabic label
- English label
- destination
- link group
- sort order
- visible/hidden
- internal/external type
- same-tab/new-tab where appropriate

Internal links must not publish as broken links to missing/unpublished CMS pages. The admin workflow should validate or warn before publish.

## Country Content Ownership

Country cultural/editorial fields belong to Country content management. Homepage only references Country IDs.
Expected content capability includes bilingual cultural introduction and controlled imagery. Exact country media field limits will be finalized during the Country CMS module design.

## SEO Basics — MVP

Approved SEO foundation:
- SEO title
- Meta description
- Slug where the content type owns a slug
- Canonical URL
- Open Graph title
- Open Graph description
- Open Graph image
- Sitemap integration
- basic structured data where semantically appropriate

Not MVP:
- AI SEO
- automated keyword scoring
- advanced SEO scoring engines
- unrestricted dynamic SEO rule builders
- large advanced redirect-management systems

## Security & Architecture

- Super Admin only for CMS mutations in MVP.
- Public users receive Published content only.
- Draft content must never be exposed through ordinary public APIs.
- Preview access must be authenticated and authorized.
- Mutations occur server-side through narrow validated APIs/RPC boundaries.
- Storage uploads use controlled file type/size rules and private or appropriately scoped storage until publish behavior is validated.
- Marketplace entities are referenced by IDs and revalidated at render/publish time.
- No sensitive customer/artisan data belongs in CMS content.
- Changes to important policy content require auditable history/version records.
- Published content must preserve a stable version until a new version is explicitly published.

## Current Homepage Audit Note

The current `src/app/page.tsx` is a client-heavy homepage that directly loads marketplace data and contains presentation/content choices in code. CMS implementation should migrate content/configuration incrementally rather than rewrite the whole marketplace homepage at once.

Existing trusted marketplace behavior — especially promotion pricing, product eligibility and Recently Viewed persistence — must be reused rather than reimplemented inside CMS.

## Implementation Order

1. CMS foundation: content versions, publication state, audit, secure media/reference model.
2. Homepage section registry/configuration and ordering.
3. Homepage public read model.
4. Super Admin Homepage Dashboard.
5. Preview + Publish workflow.
6. Campaign override integration.
7. Footer management.
8. Remaining CMS domains: Countries, Static Pages, Help/Contact, Blog, SEO.

Each module must be tested before the next module is considered closed.

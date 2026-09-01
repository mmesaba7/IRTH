import Link from "next/link";

const MODULES = [
  ["Homepage", "Sections, order, visibility", "/dashboard-admin/content/homepage"],
  ["Countries", "Edit cultural content from Countries management", "/dashboard-admin/countries"],
  ["Static Pages", "Bilingual constrained pages", "/dashboard-admin/content/static-pages"],
  ["Blog", "IRTH Journal posts", "/dashboard-admin/content/blog"],
  ["Help", "Help Center and FAQs", "/dashboard-admin/content/help"],
  ["Contact", "Public IRTH contact information", "/dashboard-admin/content/contact"],
  ["Footer", "Groups, links, visibility and order", "/dashboard-admin/content/footer"],
  ["Campaign", "Scheduled homepage campaign", "/dashboard-admin/content/campaign"],
  ["Brand & Site Assets", "Logo, favicon, social and placeholder images", "/dashboard-admin/content/brand"],
  ["Secure Preview", "Preview Draft content as Super Admin", "/dashboard-admin/content/preview"],
] as const;

export default function ContentManagerPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-6 md:py-16">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6">
          <div>
            <p className="section-eyebrow">Admin</p>
            <h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Content Manager</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">Manage IRTH public content through the constrained CMS. Draft remains private until Publish.</p>
          </div>
          <Link href="/dashboard-admin/dashboard" className="btn-secondary">← Dashboard</Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(([title, description, href]) => (
            <Link key={href} href={href} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
              <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

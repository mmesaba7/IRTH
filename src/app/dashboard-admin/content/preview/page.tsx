import Link from "next/link";
import PreviewClient from "./PreviewClient";

export default async function CmsPreviewPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const params = await searchParams;
  const initialKey = typeof params.key === "string" ? params.key : "help:main";

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-6 md:py-16">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6">
          <div>
            <p className="section-eyebrow">Content Manager</p>
            <h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Secure Draft Preview</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">Super Admin-only preview of the current Draft payload. Draft content is not exposed through the ordinary public CMS APIs.</p>
          </div>
          <div className="flex gap-2"><Link href="/dashboard-admin/content" className="btn-secondary">Content Manager</Link><Link href="/dashboard-admin/dashboard" className="btn-secondary">Dashboard</Link></div>
        </div>
        <div className="mt-8"><PreviewClient initialKey={initialKey} /></div>
      </section>
    </main>
  );
}

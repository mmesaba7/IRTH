"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type StoredPage = {
  id: string;
  key: string;
  draftRevision: number | null;
  publishedRevision: number | null;
  draftPayload: Record<string, unknown> | null;
  publishedPayload: Record<string, unknown> | null;
  updatedAt: string | null;
  publishedAt: string | null;
};

type FormState = {
  slug: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  seoTitleAr: string;
  seoTitleEn: string;
  metaDescriptionAr: string;
  metaDescriptionEn: string;
  canonicalUrl: string;
};

const EMPTY: FormState = {
  slug: "",
  titleAr: "",
  titleEn: "",
  bodyAr: "",
  bodyEn: "",
  seoTitleAr: "",
  seoTitleEn: "",
  metaDescriptionAr: "",
  metaDescriptionEn: "",
  canonicalUrl: "",
};

function fromStored(page: StoredPage): FormState {
  const source = page.draftPayload ?? page.publishedPayload ?? {};
  const seo = source.seo && typeof source.seo === "object" && !Array.isArray(source.seo)
    ? source.seo as Record<string, unknown>
    : {};
  const value = (key: string) => typeof source[key] === "string" ? source[key] as string : "";
  const seoValue = (key: string) => typeof seo[key] === "string" ? seo[key] as string : "";
  return {
    slug: value("slug"),
    titleAr: value("titleAr"),
    titleEn: value("titleEn"),
    bodyAr: value("bodyAr"),
    bodyEn: value("bodyEn"),
    seoTitleAr: seoValue("titleAr"),
    seoTitleEn: seoValue("titleEn"),
    metaDescriptionAr: seoValue("metaDescriptionAr"),
    metaDescriptionEn: seoValue("metaDescriptionEn"),
    canonicalUrl: seoValue("canonicalUrl"),
  };
}

export default function StaticPagesAdminPage() {
  const [pages, setPages] = useState<StoredPage[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selected = useMemo(() => pages.find((page) => page.key === selectedKey) ?? null, [pages, selectedKey]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/cms/static-pages", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load static pages.");
      setPages(Array.isArray(body.pages) ? body.pages : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load static pages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function choose(page: StoredPage) {
    setSelectedKey(page.key);
    setForm(fromStored(page));
    setMessage("");
    setError("");
  }

  function startNew() {
    setSelectedKey(null);
    setForm(EMPTY);
    setMessage("");
    setError("");
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveDraft() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/cms/static-pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          slug: form.slug,
          titleAr: form.titleAr,
          titleEn: form.titleEn,
          bodyAr: form.bodyAr,
          bodyEn: form.bodyEn,
          seo: {
            titleAr: form.seoTitleAr,
            titleEn: form.seoTitleEn,
            metaDescriptionAr: form.metaDescriptionAr,
            metaDescriptionEn: form.metaDescriptionEn,
            canonicalUrl: form.canonicalUrl,
          },
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save draft.");
      setMessage("Draft saved. Public page is unchanged until Publish.");
      await load();
      setSelectedKey(`page:${form.slug.trim()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save draft.");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!form.slug.trim()) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/cms/static-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", slug: form.slug }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to publish page.");
      setMessage("Published successfully.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish page.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8 text-[var(--text-primary)] md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-eyebrow">Content Manager</p>
            <h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Static Pages</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">Bilingual constrained pages with Draft / Publish and SEO basics. No arbitrary HTML or scripts.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard-admin/dashboard" className="btn-secondary">Dashboard</Link>
            <button onClick={startNew} className="btn-primary">New page</button>
          </div>
        </div>

        {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{message}</div>}

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-4">
            <p className="text-sm font-semibold">Existing pages</p>
            {loading ? <p className="mt-4 text-sm text-[var(--text-muted)]">Loading...</p> : pages.length === 0 ? <p className="mt-4 text-sm text-[var(--text-muted)]">No static pages yet.</p> : (
              <div className="mt-4 space-y-2">
                {pages.map((page) => {
                  const source = page.draftPayload ?? page.publishedPayload ?? {};
                  const title = typeof source.titleEn === "string" ? source.titleEn : page.key;
                  const slug = typeof source.slug === "string" ? source.slug : page.key.replace(/^page:/, "");
                  return <button key={page.key} onClick={() => choose(page)} className={`w-full rounded-lg border p-3 text-left ${selectedKey === page.key ? "border-[var(--color-copper)]" : "border-[var(--border-soft)]"}`}><span className="block text-sm font-medium">{title}</span><span className="mt-1 block text-xs text-[var(--text-muted)]">/{slug} · {page.publishedRevision ? "Published" : "Draft only"}</span></button>;
                })}
              </div>
            )}
          </aside>

          <section className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-7">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium md:col-span-2">Slug<input disabled={Boolean(selected)} value={form.slug} onChange={(e) => update("slug", e.target.value)} placeholder="about-irth" className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2 disabled:opacity-60" /></label>
              <label className="text-sm font-medium">العنوان العربي<input dir="rtl" value={form.titleAr} onChange={(e) => update("titleAr", e.target.value)} className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /></label>
              <label className="text-sm font-medium">English title<input value={form.titleEn} onChange={(e) => update("titleEn", e.target.value)} className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /></label>
              <label className="text-sm font-medium">المحتوى العربي<textarea dir="rtl" rows={14} value={form.bodyAr} onChange={(e) => update("bodyAr", e.target.value)} className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /></label>
              <label className="text-sm font-medium">English content<textarea rows={14} value={form.bodyEn} onChange={(e) => update("bodyEn", e.target.value)} className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /></label>
            </div>

            <div className="mt-8 border-t border-[var(--border-soft)] pt-6">
              <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">SEO Basics</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Optional. Empty values fall back to page title/content.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input placeholder="SEO title Arabic" value={form.seoTitleAr} onChange={(e) => update("seoTitleAr", e.target.value)} className="rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" />
                <input placeholder="SEO title English" value={form.seoTitleEn} onChange={(e) => update("seoTitleEn", e.target.value)} className="rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" />
                <textarea placeholder="Meta description Arabic" value={form.metaDescriptionAr} onChange={(e) => update("metaDescriptionAr", e.target.value)} className="rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" />
                <textarea placeholder="Meta description English" value={form.metaDescriptionEn} onChange={(e) => update("metaDescriptionEn", e.target.value)} className="rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" />
                <input placeholder="Canonical URL (optional)" value={form.canonicalUrl} onChange={(e) => update("canonicalUrl", e.target.value)} className="rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2 md:col-span-2" />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 border-t border-[var(--border-soft)] pt-6">
              <button disabled={saving} onClick={() => void saveDraft()} className="btn-secondary">{saving ? "Working..." : "Save Draft"}</button>
              <button disabled={saving || !selected} onClick={() => void publish()} className="btn-primary">Publish</button>
              {selected?.publishedRevision && form.slug && <Link href={`/pages/${form.slug}`} target="_blank" className="btn-secondary">View public page</Link>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

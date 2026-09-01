"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BlogPayload = {
  slug: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  bodyAr: string;
  bodyEn: string;
  coverImagePath: string | null;
  seo?: {
    titleAr?: string;
    titleEn?: string;
    metaDescriptionAr?: string;
    metaDescriptionEn?: string;
    canonicalUrl?: string | null;
  };
};

type BlogDocument = {
  key: string;
  draftRevision: number;
  publishedRevision: number | null;
  draftPayload: BlogPayload;
  publishedAt: string | null;
};

const EMPTY: BlogPayload = {
  slug: "",
  titleAr: "",
  titleEn: "",
  excerptAr: "",
  excerptEn: "",
  bodyAr: "",
  bodyEn: "",
  coverImagePath: null,
  seo: {},
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogDocument[]>([]);
  const [form, setForm] = useState<BlogPayload>(EMPTY);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const editing = useMemo(
    () => posts.find((post) => post.key === editingKey) ?? null,
    [posts, editingKey]
  );

  async function loadPosts() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/cms/blog", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load blog posts.");
      setPosts(Array.isArray(payload.posts) ? payload.posts : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load blog posts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPosts();
  }, []);

  function startNew() {
    setEditingKey(null);
    setForm(EMPTY);
    setMessage("");
    setError("");
  }

  function editPost(post: BlogDocument) {
    setEditingKey(post.key);
    setForm({
      ...EMPTY,
      ...post.draftPayload,
      seo: { ...post.draftPayload.seo },
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveDraft() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/cms/blog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save draft.");
      setMessage("Draft saved. Public content is unchanged until Publish.");
      await loadPosts();
      setEditingKey(`blog:${form.slug.trim()}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save draft.");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!editingKey) {
      setError("Save the draft before publishing.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/cms/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", slug: form.slug }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to publish post.");
      setMessage("Blog post published successfully.");
      await loadPosts();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Unable to publish post.");
    } finally {
      setSaving(false);
    }
  }

  function field<K extends keyof BlogPayload>(key: K, value: BlogPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function seoField(key: string, value: string) {
    setForm((current) => ({
      ...current,
      seo: { ...(current.seo ?? {}), [key]: value },
    }));
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Content Manager</p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Blog</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Bilingual articles with Draft → Publish workflow and CMS audit history.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={startNew} className="btn-secondary">New article</button>
            <Link href="/dashboard-admin/content/homepage" className="btn-secondary">Homepage CMS</Link>
          </div>
        </div>

        {message && <div className="mt-5 rounded-[var(--radius-md)] border border-green-200 bg-green-50 p-4 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-5 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-eyebrow">{editing ? "Edit article" : "New article"}</p>
              <h2 className="mt-2 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Article content</h2>
            </div>
            {editing && <span className="text-xs text-[var(--text-muted)]">Draft r{editing.draftRevision} · Published {editing.publishedRevision ?? "—"}</span>}
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="text-sm">Slug
              <input value={form.slug} disabled={Boolean(editingKey)} onChange={(e) => field("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="heritage-of-pottery" className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 disabled:opacity-60" />
            </label>
            <div className="hidden md:block" />
            <label className="text-sm">العنوان بالعربي
              <input value={form.titleAr} onChange={(e) => field("titleAr", e.target.value)} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" dir="rtl" />
            </label>
            <label className="text-sm">English title
              <input value={form.titleEn} onChange={(e) => field("titleEn", e.target.value)} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" />
            </label>
            <label className="text-sm">الملخص بالعربي
              <textarea value={form.excerptAr} onChange={(e) => field("excerptAr", e.target.value)} rows={4} maxLength={500} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" dir="rtl" />
            </label>
            <label className="text-sm">English excerpt
              <textarea value={form.excerptEn} onChange={(e) => field("excerptEn", e.target.value)} rows={4} maxLength={500} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" />
            </label>
            <label className="text-sm">المحتوى بالعربي
              <textarea value={form.bodyAr} onChange={(e) => field("bodyAr", e.target.value)} rows={12} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" dir="rtl" />
            </label>
            <label className="text-sm">English content
              <textarea value={form.bodyEn} onChange={(e) => field("bodyEn", e.target.value)} rows={12} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" />
            </label>
          </div>

          <details className="mt-7 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-5">
            <summary className="cursor-pointer font-medium text-[var(--color-espresso)]">SEO Basics</summary>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input value={form.seo?.titleAr ?? ""} onChange={(e) => seoField("titleAr", e.target.value)} placeholder="SEO title Arabic (optional)" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3" />
              <input value={form.seo?.titleEn ?? ""} onChange={(e) => seoField("titleEn", e.target.value)} placeholder="SEO title English (optional)" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3" />
              <textarea value={form.seo?.metaDescriptionAr ?? ""} onChange={(e) => seoField("metaDescriptionAr", e.target.value)} placeholder="Meta description Arabic (optional)" rows={3} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3" />
              <textarea value={form.seo?.metaDescriptionEn ?? ""} onChange={(e) => seoField("metaDescriptionEn", e.target.value)} placeholder="Meta description English (optional)" rows={3} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3" />
              <input value={form.seo?.canonicalUrl ?? ""} onChange={(e) => seoField("canonicalUrl", e.target.value)} placeholder="Canonical URL (optional)" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 md:col-span-2" />
            </div>
          </details>

          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" disabled={saving} onClick={saveDraft} className="btn-secondary">{saving ? "Saving..." : "Save Draft"}</button>
            <button type="button" disabled={saving || !editingKey} onClick={publish} className="btn-primary">Publish</button>
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">Cover/OG image upload will use the controlled CMS Storage step; no arbitrary public image URLs are accepted here.</p>
        </section>

        <section className="mt-8">
          <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Articles</h2>
          {loading ? (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading...</p>
          ) : posts.length === 0 ? (
            <div className="mt-4 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-8 text-center text-sm text-[var(--text-secondary)]">No blog articles yet.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {posts.map((post) => (
                <button key={post.key} type="button" onClick={() => editPost(post)} className="flex w-full items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 text-left transition hover:shadow-[var(--shadow-card)]">
                  <div>
                    <p className="font-medium text-[var(--color-espresso)]">{post.draftPayload?.titleAr || post.draftPayload?.titleEn || post.key}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">/{post.draftPayload?.slug} · Draft r{post.draftRevision}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs ${post.publishedRevision ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{post.publishedRevision ? "Published" : "Draft"}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

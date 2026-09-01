"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type RegistryItem = {
  key: string;
  label: string;
  defaultOrder: number;
  reorderable: boolean;
};

type SectionState = {
  key: string;
  visible: boolean;
  order: number;
};

type CmsDocument = {
  key: string;
  contentType: string;
  draftRevision: number;
  publishedRevision: number | null;
  draftPayload: { schemaVersion?: number; sections?: SectionState[] };
  publishedPayload: { schemaVersion?: number; sections?: SectionState[] } | null;
  updatedAt: string | null;
  publishedAt: string | null;
};

export default function AdminHomepageContentPage() {
  const [registry, setRegistry] = useState<RegistryItem[]>([]);
  const [document, setDocument] = useState<CmsDocument | null>(null);
  const [sections, setSections] = useState<SectionState[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<"save" | "publish" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/cms/homepage", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to load homepage CMS.");

      const nextRegistry = Array.isArray(body?.registry) ? (body.registry as RegistryItem[]) : [];
      const nextDocument = body?.document as CmsDocument | null;
      const draftSections = Array.isArray(nextDocument?.draftPayload?.sections)
        ? nextDocument!.draftPayload.sections!
        : nextRegistry.map((item) => ({ key: item.key, visible: true, order: item.defaultOrder }));

      setRegistry(nextRegistry);
      setDocument(nextDocument);
      setSections([...draftSections].sort((a, b) => a.order - b.order));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load homepage CMS.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const labels = useMemo(() => new Map(registry.map((item) => [item.key, item.label])), [registry]);

  function normalize(next: SectionState[]) {
    return next.map((item, index) => ({ ...item, order: index + 1 }));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(normalize(next));
    setMessage("");
  }

  function toggle(key: string) {
    setSections((current) => current.map((item) => (item.key === key ? { ...item, visible: !item.visible } : item)));
    setMessage("");
  }

  async function saveDraft() {
    if (working) return;
    setWorking("save");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/cms/homepage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: normalize(sections) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to save draft.");
      setMessage("Draft saved. Public homepage is unchanged until Publish.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save draft.");
    } finally {
      setWorking(null);
    }
  }

  async function publish() {
    if (working) return;
    setWorking("publish");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/cms/homepage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to publish homepage.");
      setMessage("Homepage configuration published.");
      await load();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Unable to publish homepage.");
    } finally {
      setWorking(null);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[var(--background)]"><div className="flex h-96 items-center justify-center text-[var(--text-secondary)]">Loading homepage CMS…</div></main>;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-20 text-[var(--text-primary)]">
      <section className="mx-auto max-w-5xl px-5 py-10 md:px-6 md:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Content Manager</p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Homepage Sections</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Reorder or hide approved homepage sections. Save Draft never changes the public site. Publish copies the current draft into the public configuration.
            </p>
          </div>
          <Link href="/dashboard-admin/dashboard" className="self-start rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)]">← Dashboard</Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Draft revision</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--color-espresso)]">{document?.draftRevision ?? "—"}</p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Published revision</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--color-espresso)]">{document?.publishedRevision ?? "—"}</p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Visible sections</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--color-espresso)]">{sections.filter((item) => item.visible).length}/{sections.length}</p>
          </div>
        </div>

        {message && <div className="mt-5 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-5 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="mt-8 space-y-3">
          {sections.map((section, index) => (
            <article key={section.key} className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-muted)] text-sm font-semibold text-[var(--color-espresso)]">{index + 1}</div>
                <div>
                  <p className="font-medium text-[var(--color-espresso)]">{labels.get(section.key) || section.key}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{section.key} · {section.visible ? "Visible" : "Hidden"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0 || Boolean(working)} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-3 py-2 text-sm disabled:opacity-40">↑ Up</button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === sections.length - 1 || Boolean(working)} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-3 py-2 text-sm disabled:opacity-40">↓ Down</button>
                <button type="button" onClick={() => toggle(section.key)} disabled={Boolean(working)} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-3 py-2 text-sm disabled:opacity-40">{section.visible ? "Hide" : "Show"}</button>
              </div>
            </article>
          ))}
        </div>

        <div className="sticky bottom-4 mt-8 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-[var(--text-muted)]">Publish is deliberate: draft changes remain private until you choose Publish.</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => void saveDraft()} disabled={Boolean(working)} className="rounded-[var(--radius-md)] border border-[var(--color-espresso)] px-5 py-2.5 text-sm font-medium text-[var(--color-espresso)] disabled:opacity-50">{working === "save" ? "Saving…" : "Save Draft"}</button>
            <button type="button" onClick={() => void publish()} disabled={Boolean(working)} className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-5 py-2.5 text-sm font-medium text-[var(--color-ivory)] disabled:opacity-50">{working === "publish" ? "Publishing…" : "Publish"}</button>
          </div>
        </div>
      </section>
    </main>
  );
}

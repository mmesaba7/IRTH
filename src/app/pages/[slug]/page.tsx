"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import Header from "@/app/components/Header";
import MobileBottomNav from "@/app/components/MobileBottomNav";

type StaticPagePayload = {
  slug: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
};

export default function StaticPage() {
  const params = useParams<{ slug: string }>();
  const [payload, setPayload] = useState<StaticPagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/pages/${encodeURIComponent(params.slug)}`, { cache: "no-store" });
        if (!response.ok) throw new Error(response.status === 404 ? "Page not found." : "Unable to load page.");
        const result = await response.json() as { page?: { payload?: StaticPagePayload } };
        if (!cancelled) setPayload(result.page?.payload ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [params.slug]);

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />
      <div className="mx-auto max-w-4xl px-5 py-12 md:px-6 md:py-16">
        <Link href="/" className="text-sm font-medium text-[var(--color-copper)] hover:underline">← IRTH</Link>

        {loading && (
          <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-8 text-sm text-[var(--text-secondary)]">
            Loading page…
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && !payload && (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-8 text-sm text-[var(--text-secondary)]">
            This page is not available right now.
          </div>
        )}

        {payload && (
          <article className="mt-8 space-y-10">
            <section dir="rtl" className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 md:p-10">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">IRTH</p>
              <h1 className="mt-3 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">{payload.titleAr}</h1>
              <div className="mt-6 whitespace-pre-wrap text-base leading-8 text-[var(--text-secondary)]">{payload.bodyAr}</div>
            </section>

            <section dir="ltr" className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 md:p-10">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">IRTH</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-4xl">{payload.titleEn}</h2>
              <div className="mt-6 whitespace-pre-wrap text-base leading-8 text-[var(--text-secondary)]">{payload.bodyEn}</div>
            </section>
          </article>
        )}
      </div>

      <MobileBottomNav />
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Header from "@/app/components/Header";
import type { HelpPayload } from "@/lib/cms/help";

export default function HelpPage() {
  const [help, setHelp] = useState<HelpPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/help", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(response.status === 404 ? "Help content is not published yet." : body.error || "Unable to load Help.");
        setHelp(body.help as HelpPayload);
      })
      .catch((err) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load Help."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-6 md:py-16">
        {loading && <p className="text-[var(--text-secondary)]">Loading...</p>}
        {error && <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {help && (
          <>
            <section className="grid gap-6 border-b border-[var(--border-soft)] pb-10 md:grid-cols-2">
              <div dir="rtl"><h1 className="font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">{help.titleAr}</h1><p className="mt-4 leading-8 text-[var(--text-secondary)]">{help.introAr}</p></div>
              <div dir="ltr"><h2 className="font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">{help.titleEn}</h2><p className="mt-4 leading-8 text-[var(--text-secondary)]">{help.introEn}</p></div>
            </section>
            <div className="mt-10 space-y-4">
              {help.faqs.map((faq) => (
                <details key={faq.id} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
                  <summary className="cursor-pointer font-semibold text-[var(--color-espresso)]"><span dir="rtl">{faq.questionAr}</span><span className="mx-2 text-[var(--text-muted)]">/</span><span dir="ltr">{faq.questionEn}</span></summary>
                  <div className="mt-5 grid gap-5 border-t border-[var(--border-soft)] pt-5 md:grid-cols-2">
                    <p dir="rtl" className="whitespace-pre-wrap leading-7 text-[var(--text-secondary)]">{faq.answerAr}</p>
                    <p dir="ltr" className="whitespace-pre-wrap leading-7 text-[var(--text-secondary)]">{faq.answerEn}</p>
                  </div>
                </details>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
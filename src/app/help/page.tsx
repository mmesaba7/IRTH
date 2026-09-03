"use client";

import { useEffect, useState } from "react";
import Header from "@/app/components/Header";
import MobileBottomNav from "@/app/components/MobileBottomNav";
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
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Help content is not published yet."
              : body.error || "Unable to load Help."
          );
        }
        setHelp(body.help as HelpPayload);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Unable to load Help.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      <section className="border-b border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="mx-auto max-w-5xl px-5 py-12 md:px-6 md:py-16">
          <p className="section-eyebrow">Help & guidance</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            Find answers from IRTH&apos;s published Help content.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-10 md:px-6 md:py-14">
        {loading && (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            <div className="h-8 w-48 animate-pulse rounded bg-[var(--surface-muted)]" />
            <div className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-muted)]" />
            <div className="h-20 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-muted)]" />
          </div>
        )}

        {error && (
          <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {help && (
          <>
            <section className="grid gap-8 border-b border-[var(--border-soft)] pb-10 md:grid-cols-2 md:gap-12">
              <div dir="rtl">
                <h1 className="font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">
                  {help.titleAr}
                </h1>
                <p className="mt-4 leading-8 text-[var(--text-secondary)]">{help.introAr}</p>
              </div>

              <div dir="ltr">
                <h2 className="font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">
                  {help.titleEn}
                </h2>
                <p className="mt-4 leading-8 text-[var(--text-secondary)]">{help.introEn}</p>
              </div>
            </section>

            {help.faqs.length === 0 ? (
              <div className="mt-10 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-8 text-center text-sm text-[var(--text-secondary)]">
                No help topics are published yet.
              </div>
            ) : (
              <div className="mt-10 space-y-4">
                {help.faqs.map((faq, index) => (
                  <details
                    key={faq.id}
                    className="group rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 transition hover:border-[var(--color-copper)]/45 md:p-6"
                  >
                    <summary className="flex cursor-pointer list-none items-start gap-4 font-semibold text-[var(--color-espresso)]">
                      <span className="mt-0.5 font-[var(--font-display)] text-xl text-[var(--color-copper)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span dir="rtl">{faq.questionAr}</span>
                        <span className="mx-2 text-[var(--text-muted)]">/</span>
                        <span dir="ltr">{faq.questionEn}</span>
                      </span>
                      <span aria-hidden="true" className="text-xl font-normal text-[var(--text-muted)] transition group-open:rotate-45">
                        +
                      </span>
                    </summary>

                    <div className="mt-5 grid gap-5 border-t border-[var(--border-soft)] pt-5 md:grid-cols-2 md:gap-8">
                      <p dir="rtl" className="whitespace-pre-wrap leading-7 text-[var(--text-secondary)]">{faq.answerAr}</p>
                      <p dir="ltr" className="whitespace-pre-wrap leading-7 text-[var(--text-secondary)]">{faq.answerEn}</p>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <MobileBottomNav />
    </main>
  );
}

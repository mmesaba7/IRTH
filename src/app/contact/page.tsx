"use client";

import { useEffect, useState } from "react";
import Header from "@/app/components/Header";
import MobileBottomNav from "@/app/components/MobileBottomNav";
import type { ContactPayload } from "@/lib/cms/contact";

export default function ContactPage() {
  const [contact, setContact] = useState<ContactPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/contact", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Contact content is not published yet."
              : body.error || "Unable to load Contact."
          );
        }
        setContact(body.contact as ContactPayload);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Unable to load Contact.");
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

      <section className="relative overflow-hidden bg-[var(--color-espresso)] text-[var(--color-ivory)]">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full border border-[var(--color-copper)]/20" />
        <div className="absolute -bottom-28 left-12 h-56 w-56 rotate-45 border border-[var(--color-copper)]/10" />
        <div className="relative mx-auto max-w-5xl px-5 py-14 md:px-6 md:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-copper)]">Contact IRTH</p>
          <p className="mt-4 max-w-2xl font-[var(--font-display)] text-4xl leading-tight md:text-6xl">
            Reach the right IRTH channel.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-10 md:px-6 md:py-14">
        {loading && (
          <div className="grid gap-5 sm:grid-cols-2" aria-live="polite" aria-busy="true">
            <div className="h-36 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-muted)]" />
            <div className="h-36 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-muted)]" />
          </div>
        )}

        {error && (
          <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {contact && (
          <>
            <section className="grid gap-8 border-b border-[var(--border-soft)] pb-10 md:grid-cols-2 md:gap-12">
              <div dir="rtl">
                <h1 className="font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">{contact.titleAr}</h1>
                <p className="mt-4 leading-8 text-[var(--text-secondary)]">{contact.introAr}</p>
              </div>

              <div dir="ltr">
                <h2 className="font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">{contact.titleEn}</h2>
                <p className="mt-4 leading-8 text-[var(--text-secondary)]">{contact.introEn}</p>
              </div>
            </section>

            {contact.items.length === 0 ? (
              <div className="mt-10 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-8 text-center text-sm text-[var(--text-secondary)]">
                No contact channels are published yet.
              </div>
            ) : (
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {contact.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 transition hover:border-[var(--color-copper)]/45"
                  >
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      <span dir="rtl">{item.labelAr}</span>
                      <span className="mx-2">/</span>
                      <span dir="ltr">{item.labelEn}</span>
                    </p>
                    {item.url ? (
                      <a
                        href={item.url}
                        className="mt-3 block break-words font-medium text-[var(--color-copper)] hover:underline"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p className="mt-3 break-words font-medium text-[var(--color-espresso)]">{item.value}</p>
                    )}
                  </div>
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

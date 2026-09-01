"use client";

import { useEffect, useState } from "react";
import Header from "@/app/components/Header";
import type { ContactPayload } from "@/lib/cms/contact";

export default function ContactPage() {
  const [contact, setContact] = useState<ContactPayload | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/contact", { cache: "no-store" }).then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(r.status === 404 ? "Contact content is not published yet." : b.error || "Unable to load Contact."); setContact(b.contact); }).catch((e) => setError(e instanceof Error ? e.message : "Unable to load Contact.")); }, []);
  return <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]"><Header /><div className="mx-auto max-w-5xl px-5 py-12 md:px-6 md:py-16">{error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}{contact && <><div className="grid gap-8 md:grid-cols-2"><div dir="rtl"><h1 className="font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">{contact.titleAr}</h1><p className="mt-4 leading-8 text-[var(--text-secondary)]">{contact.introAr}</p></div><div dir="ltr"><h2 className="font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">{contact.titleEn}</h2><p className="mt-4 leading-8 text-[var(--text-secondary)]">{contact.introEn}</p></div></div><div className="mt-10 grid gap-4 sm:grid-cols-2">{contact.items.map((item) => <div key={item.id} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5"><p className="text-xs text-[var(--text-muted)]"><span dir="rtl">{item.labelAr}</span> / <span dir="ltr">{item.labelEn}</span></p>{item.url ? <a href={item.url} className="mt-2 block font-medium text-[var(--color-copper)] hover:underline">{item.value}</a> : <p className="mt-2 font-medium">{item.value}</p>}</div>)}</div></>}</div></main>;
}
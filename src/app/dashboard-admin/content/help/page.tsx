"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HelpFaqItem, HelpPayload } from "@/lib/cms/help";

type CmsDocument = { draftRevision: number | null; publishedRevision: number | null; draftPayload: HelpPayload | null; publishedPayload: HelpPayload | null };

const EMPTY: HelpPayload = { schemaVersion: 1, titleAr: "", titleEn: "", introAr: "", introEn: "", faqs: [] };
const newFaq = (): HelpFaqItem => ({ id: `faq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, questionAr: "", questionEn: "", answerAr: "", answerEn: "" });

export default function HelpAdminPage() {
  const [document, setDocument] = useState<CmsDocument | null>(null);
  const [form, setForm] = useState<HelpPayload>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/cms/help", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load Help content.");
      const doc = body.document as CmsDocument | null;
      setDocument(doc);
      setForm(doc?.draftPayload ?? doc?.publishedPayload ?? EMPTY);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load Help content."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function updateFaq(index: number, key: keyof HelpFaqItem, value: string) {
    setForm((current) => ({ ...current, faqs: current.faqs.map((faq, i) => i === index ? { ...faq, [key]: value } : faq) }));
  }
  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= form.faqs.length) return;
    setForm((current) => { const faqs = [...current.faqs]; [faqs[index], faqs[next]] = [faqs[next], faqs[index]]; return { ...current, faqs }; });
  }

  async function saveDraft() {
    setSaving(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/cms/help", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save Help draft.");
      setMessage("Draft saved. Public Help remains unchanged until Publish.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save Help draft."); }
    finally { setSaving(false); }
  }

  async function publish() {
    setSaving(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/cms/help", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish" }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to publish Help content.");
      setMessage("Help published successfully.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to publish Help content."); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="min-h-screen bg-[var(--background)] p-8 text-[var(--text-secondary)]">Loading Help CMS...</main>;

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8 text-[var(--text-primary)] md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="section-eyebrow">Content Manager</p><h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Help</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Bilingual Help Center and ordered FAQs. Draft content is never public until Publish.</p></div><div className="flex gap-2"><Link href="/dashboard-admin/dashboard" className="btn-secondary">Dashboard</Link>{document?.publishedRevision ? <Link href="/help" target="_blank" className="btn-secondary">View public Help</Link> : null}</div></div>
        {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{message}</div>}

        <section className="mt-8 rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-7">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-medium">العنوان العربي<input dir="rtl" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /></label>
            <label className="text-sm font-medium">English title<input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /></label>
            <label className="text-sm font-medium">المقدمة العربية<textarea dir="rtl" rows={4} value={form.introAr} onChange={(e) => setForm({ ...form, introAr: e.target.value })} className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /></label>
            <label className="text-sm font-medium">English intro<textarea rows={4} value={form.introEn} onChange={(e) => setForm({ ...form, introEn: e.target.value })} className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /></label>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-[var(--border-soft)] pt-6"><div><h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">FAQs</h2><p className="mt-1 text-xs text-[var(--text-muted)]">Add, edit, delete and reorder bilingual questions.</p></div><button onClick={() => setForm((current) => ({ ...current, faqs: [...current.faqs, newFaq()] }))} className="btn-secondary">Add question</button></div>
          <div className="mt-5 space-y-5">
            {form.faqs.map((faq, index) => <div key={faq.id} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">Question {index + 1}</p><div className="flex gap-2"><button onClick={() => move(index, -1)} disabled={index === 0} className="btn-secondary">↑</button><button onClick={() => move(index, 1)} disabled={index === form.faqs.length - 1} className="btn-secondary">↓</button><button onClick={() => setForm((current) => ({ ...current, faqs: current.faqs.filter((_, i) => i !== index) }))} className="btn-secondary">Delete</button></div></div><div className="mt-4 grid gap-4 md:grid-cols-2"><input dir="rtl" placeholder="السؤال بالعربية" value={faq.questionAr} onChange={(e) => updateFaq(index, "questionAr", e.target.value)} className="rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /><input placeholder="Question in English" value={faq.questionEn} onChange={(e) => updateFaq(index, "questionEn", e.target.value)} className="rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /><textarea dir="rtl" rows={5} placeholder="الإجابة بالعربية" value={faq.answerAr} onChange={(e) => updateFaq(index, "answerAr", e.target.value)} className="rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /><textarea rows={5} placeholder="Answer in English" value={faq.answerEn} onChange={(e) => updateFaq(index, "answerEn", e.target.value)} className="rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /></div></div>)}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--border-soft)] pt-6"><button disabled={saving} onClick={() => void saveDraft()} className="btn-secondary">{saving ? "Working..." : "Save Draft"}</button><button disabled={saving || !document?.draftRevision} onClick={() => void publish()} className="btn-primary">Publish</button><span className="text-xs text-[var(--text-muted)]">Draft r{document?.draftRevision ?? 0} · Published r{document?.publishedRevision ?? 0}</span></div>
        </section>
      </div>
    </main>
  );
}
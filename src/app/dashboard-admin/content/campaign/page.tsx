"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CampaignPayload } from "@/lib/cms/campaign";

type Asset = { id: string; mimeType: string; fileSizeBytes: number; previewUrl: string | null };
type CmsDocument = {
  draftRevision: number | null;
  publishedRevision: number | null;
  draftPayload: CampaignPayload | null;
  publishedPayload: CampaignPayload | null;
};

type FormState = Omit<CampaignPayload, "schemaVersion" | "startAt" | "endAt"> & {
  startAt: string;
  endAt: string;
};

function localInputValue(date: Date) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

const now = new Date();
const EMPTY: FormState = {
  active: true,
  titleAr: "",
  titleEn: "",
  bodyAr: "",
  bodyEn: "",
  ctaLabelAr: null,
  ctaLabelEn: null,
  ctaUrl: null,
  startAt: localInputValue(now),
  endAt: localInputValue(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)),
  backgroundImageAssetId: null,
};

function fromDocument(document: CmsDocument | null): FormState {
  const payload = document?.draftPayload ?? document?.publishedPayload;
  if (!payload) return EMPTY;
  return {
    active: payload.active,
    titleAr: payload.titleAr,
    titleEn: payload.titleEn,
    bodyAr: payload.bodyAr,
    bodyEn: payload.bodyEn,
    ctaLabelAr: payload.ctaLabelAr,
    ctaLabelEn: payload.ctaLabelEn,
    ctaUrl: payload.ctaUrl,
    startAt: localInputValue(new Date(payload.startAt)),
    endAt: localInputValue(new Date(payload.endAt)),
    backgroundImageAssetId: payload.backgroundImageAssetId,
  };
}

export default function CampaignAdminPage() {
  const [document, setDocument] = useState<CmsDocument | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedAsset = useMemo(() => assets.find((asset) => asset.id === form.backgroundImageAssetId) ?? null, [assets, form.backgroundImageAssetId]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/cms/campaign", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load Campaign.");
      const nextDocument = (body.document ?? null) as CmsDocument | null;
      setDocument(nextDocument);
      setAssets(Array.isArray(body.assets) ? body.assets : []);
      setForm(fromDocument(nextDocument));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Campaign.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function upload(file: File) {
    if (working) return;
    setWorking(true); setError(""); setMessage("");
    try {
      const intentResponse = await fetch("/api/admin/cms/media/upload-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType: file.type, fileSize: file.size }),
      });
      const intent = await intentResponse.json();
      if (!intentResponse.ok) throw new Error(intent.error || "Unable to prepare upload.");
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("cms-media")
        .uploadToSignedUrl(intent.storagePath, intent.token, file, { contentType: file.type });
      if (uploadError) throw new Error(uploadError.message || "Upload failed.");
      const finalizeResponse = await fetch("/api/admin/cms/media/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: intent.assetId }),
      });
      const finalized = await finalizeResponse.json();
      if (!finalizeResponse.ok) throw new Error(finalized.error || "Unable to finalize upload.");
      setMessage("Campaign image uploaded and verified.");
      await load();
      setForm((current) => ({ ...current, backgroundImageAssetId: intent.assetId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally { setWorking(false); }
  }

  function payload() {
    return {
      schemaVersion: 1,
      ...form,
      ctaLabelAr: form.ctaLabelAr?.trim() || null,
      ctaLabelEn: form.ctaLabelEn?.trim() || null,
      ctaUrl: form.ctaUrl?.trim() || null,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
    };
  }

  async function saveDraft() {
    if (working) return;
    setWorking(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/cms/campaign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save Campaign draft.");
      setMessage("Campaign draft saved. Public homepage is unchanged until Publish and the schedule is live.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save Campaign draft."); }
    finally { setWorking(false); }
  }

  async function publish() {
    if (working) return;
    setWorking(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/cms/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to publish Campaign.");
      setMessage("Campaign published. It will appear only while Active and inside its scheduled time window.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to publish Campaign."); }
    finally { setWorking(false); }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-6 md:py-16">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6">
          <div><p className="section-eyebrow">Content Manager</p><h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Campaign</h1><p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">One controlled scheduled campaign for the MVP. Published content only becomes live when Active and between Start / End.</p></div>
          <div className="flex gap-2"><Link href="/dashboard-admin/content" className="btn-secondary">Content Manager</Link><Link href="/dashboard-admin/dashboard" className="btn-secondary">Dashboard</Link></div>
        </div>

        {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{message}</div>}
        {loading ? <p className="mt-8 text-sm text-[var(--text-secondary)]">Loading Campaign…</p> : (
          <div className="mt-8 space-y-6">
            <section className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-7">
              <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <label className="text-sm font-medium">العنوان العربي<input dir="rtl" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /></label>
                <label className="text-sm font-medium">English title<input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /></label>
                <label className="text-sm font-medium">المحتوى العربي<textarea dir="rtl" rows={5} value={form.bodyAr} onChange={(e) => setForm({ ...form, bodyAr: e.target.value })} className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /></label>
                <label className="text-sm font-medium">English content<textarea rows={5} value={form.bodyEn} onChange={(e) => setForm({ ...form, bodyEn: e.target.value })} className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /></label>
                <label className="text-sm font-medium">Start<input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /></label>
                <label className="text-sm font-medium">End<input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /></label>
              </div>
            </section>

            <section className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-7">
              <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Optional CTA</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">If used, Arabic label + English label + URL are all required together.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input dir="rtl" placeholder="نص الزر بالعربية" value={form.ctaLabelAr ?? ""} onChange={(e) => setForm({ ...form, ctaLabelAr: e.target.value || null })} className="rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" />
                <input placeholder="CTA label in English" value={form.ctaLabelEn ?? ""} onChange={(e) => setForm({ ...form, ctaLabelEn: e.target.value || null })} className="rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" />
                <input placeholder="/crafts or https://..." value={form.ctaUrl ?? ""} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value || null })} className="rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2 md:col-span-2" />
              </div>
            </section>

            <section className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-7">
              <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Optional Background Image</h2>
              {selectedAsset?.previewUrl ? <img src={selectedAsset.previewUrl} alt="Campaign background preview" className="mt-4 aspect-[16/6] w-full rounded-lg object-cover" /> : <div className="mt-4 rounded-lg bg-[var(--surface-muted)] p-10 text-center text-sm text-[var(--text-muted)]">No background image selected.</div>}
              <select value={form.backgroundImageAssetId ?? ""} onChange={(e) => setForm({ ...form, backgroundImageAssetId: e.target.value || null })} className="mt-4 w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2">
                <option value="">None</option>
                {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.mimeType} · {(asset.fileSizeBytes / 1024).toFixed(0)} KB · {asset.id.slice(0, 8)}</option>)}
              </select>
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={working} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.currentTarget.value = ""; }} className="mt-4 block w-full text-sm" />
            </section>

            <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
              <button disabled={working} onClick={() => void saveDraft()} className="btn-secondary">{working ? "Working…" : "Save Draft"}</button>
              <button disabled={working || !document?.draftRevision} onClick={() => void publish()} className="btn-primary">Publish</button>
              <span className="text-xs text-[var(--text-muted)]">Draft r{document?.draftRevision ?? 0} · Published r{document?.publishedRevision ?? 0}</span>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Asset = {
  id: string;
  mimeType: string;
  fileSizeBytes: number;
  previewUrl: string | null;
};

type BrandForm = {
  mainLogoAssetId: string | null;
  alternateLogoAssetId: string | null;
  faviconAssetId: string | null;
  defaultSocialImageAssetId: string | null;
  defaultPlaceholderAssetId: string | null;
};

const EMPTY_FORM: BrandForm = {
  mainLogoAssetId: null,
  alternateLogoAssetId: null,
  faviconAssetId: null,
  defaultSocialImageAssetId: null,
  defaultPlaceholderAssetId: null,
};

const FIELDS: Array<{ key: keyof BrandForm; label: string; help: string }> = [
  { key: "mainLogoAssetId", label: "Main Logo", help: "Primary IRTH logo used across the site." },
  { key: "alternateLogoAssetId", label: "Light / Dark Logo", help: "Optional alternate logo for contrasting backgrounds." },
  { key: "faviconAssetId", label: "Favicon", help: "Small browser/tab icon. PNG is recommended for MVP." },
  { key: "defaultSocialImageAssetId", label: "Default Social Share Image", help: "Fallback image for Open Graph/social sharing." },
  { key: "defaultPlaceholderAssetId", label: "Default Placeholder Image", help: "Fallback visual when content has no dedicated image." },
];

function parseForm(document: unknown): BrandForm {
  if (!document || typeof document !== "object" || Array.isArray(document)) return EMPTY_FORM;
  const draftPayload = (document as Record<string, unknown>).draftPayload;
  if (!draftPayload || typeof draftPayload !== "object" || Array.isArray(draftPayload)) return EMPTY_FORM;
  const record = draftPayload as Record<string, unknown>;
  return {
    mainLogoAssetId: typeof record.mainLogoAssetId === "string" ? record.mainLogoAssetId : null,
    alternateLogoAssetId: typeof record.alternateLogoAssetId === "string" ? record.alternateLogoAssetId : null,
    faviconAssetId: typeof record.faviconAssetId === "string" ? record.faviconAssetId : null,
    defaultSocialImageAssetId: typeof record.defaultSocialImageAssetId === "string" ? record.defaultSocialImageAssetId : null,
    defaultPlaceholderAssetId: typeof record.defaultPlaceholderAssetId === "string" ? record.defaultPlaceholderAssetId : null,
  };
}

export default function BrandAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [form, setForm] = useState<BrandForm>(EMPTY_FORM);
  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [publishedRevision, setPublishedRevision] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/cms/brand", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to load Brand assets.");
      setAssets(Array.isArray(body.assets) ? body.assets : []);
      setForm(parseForm(body.document));
      setDraftRevision(typeof body.document?.draftRevision === "number" ? body.document.draftRevision : null);
      setPublishedRevision(typeof body.document?.publishedRevision === "number" ? body.document.publishedRevision : null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Brand assets.");
    } finally {
      setLoading(false);
    }
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
      if (!intentResponse.ok) throw new Error(intent?.error || "Unable to prepare upload.");

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
      if (!finalizeResponse.ok) throw new Error(finalized?.error || "Unable to finalize upload.");

      setMessage("Image uploaded and verified. You can now assign it to a Brand slot.");
      await load();
    } catch (uploadFailure) {
      setError(uploadFailure instanceof Error ? uploadFailure.message : "Upload failed.");
    } finally {
      setWorking(false);
    }
  }

  async function saveDraft() {
    if (working) return;
    setWorking(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/cms/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to save Brand draft.");
      setMessage("Brand draft saved. Public site is unchanged until Publish.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save Brand draft.");
    } finally { setWorking(false); }
  }

  async function publish() {
    if (working) return;
    setWorking(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/cms/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to publish Brand assets.");
      setMessage("Brand assets published successfully.");
      await load();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Unable to publish Brand assets.");
    } finally { setWorking(false); }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-6 md:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Content Manager</p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Brand & Site Assets</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">Controlled private media. Draft changes do not affect the public site until Publish.</p>
          </div>
          <Link href="/dashboard-admin/dashboard" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm">← Dashboard</Link>
        </div>

        {message && <div className="mt-5 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-5 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="mt-6 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
          <span>Draft revision: {draftRevision ?? "—"}</span>
          <span>Published revision: {publishedRevision ?? "—"}</span>
        </div>

        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
          <label className="block text-sm font-medium text-[var(--color-espresso)]">Upload CMS image</label>
          <p className="mt-1 text-xs text-[var(--text-muted)]">JPEG / PNG / WebP · maximum 5 MB · verified server-side after upload.</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={working}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.currentTarget.value = "";
            }}
            className="mt-4 block w-full text-sm"
          />
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-[var(--text-secondary)]">Loading Brand assets…</p>
        ) : (
          <div className="mt-8 space-y-6">
            {FIELDS.map((field) => {
              const selected = assets.find((asset) => asset.id === form[field.key]);
              return (
                <section key={field.key} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-6">
                  <div className="grid gap-5 md:grid-cols-[220px_1fr] md:items-start">
                    <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-muted)]">
                      {selected?.previewUrl ? <img src={selected.previewUrl} alt={field.label} className="h-full w-full object-contain p-4" /> : <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">No asset selected</div>}
                    </div>
                    <div>
                      <h2 className="font-medium text-[var(--color-espresso)]">{field.label}</h2>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{field.help}</p>
                      <select
                        value={form[field.key] ?? ""}
                        onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value || null }))}
                        className="mt-4 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm"
                      >
                        <option value="">None</option>
                        {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.mimeType} · {(asset.fileSizeBytes / 1024).toFixed(0)} KB · {asset.id.slice(0, 8)}</option>)}
                      </select>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <div className="sticky bottom-4 mt-8 flex flex-wrap gap-3 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
          <button disabled={working || loading} onClick={() => void saveDraft()} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-3 text-sm font-medium disabled:opacity-50">Save Draft</button>
          <button disabled={working || loading || draftRevision === null} onClick={() => void publish()} className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-5 py-3 text-sm font-medium text-[var(--color-ivory)] disabled:opacity-50">Publish</button>
        </div>
      </section>
    </main>
  );
}

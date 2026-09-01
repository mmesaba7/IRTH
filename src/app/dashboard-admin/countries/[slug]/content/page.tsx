"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Asset = {
  id: string;
  mimeType: string;
  fileSizeBytes: number;
  previewUrl: string | null;
};

type Country = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
};

type CountryForm = {
  schemaVersion: 1;
  countryId: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  summaryAr: string;
  summaryEn: string;
  coverImageAssetId: string | null;
  culturalImageAssetIds: string[];
  seo: {
    titleAr: string;
    titleEn: string;
    metaDescriptionAr: string;
    metaDescriptionEn: string;
    ogImageAssetId: string | null;
  };
};

function makeEmpty(country: Country): CountryForm {
  return {
    schemaVersion: 1,
    countryId: country.id,
    slug: country.slug,
    nameAr: country.name_ar,
    nameEn: country.name_en,
    summaryAr: "",
    summaryEn: "",
    coverImageAssetId: null,
    culturalImageAssetIds: [],
    seo: {
      titleAr: country.name_ar,
      titleEn: country.name_en,
      metaDescriptionAr: "",
      metaDescriptionEn: "",
      ogImageAssetId: null,
    },
  };
}

export default function CountryContentPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [country, setCountry] = useState<Country | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [form, setForm] = useState<CountryForm | null>(null);
  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [publishedRevision, setPublishedRevision] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/cms/countries/${encodeURIComponent(slug)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to load Country CMS.");

      const nextCountry = body.country as Country;
      setCountry(nextCountry);
      setAssets(Array.isArray(body.assets) ? body.assets : []);

      const draftPayload = body.document?.draftPayload;
      if (draftPayload && typeof draftPayload === "object") {
        setForm(draftPayload as CountryForm);
      } else {
        setForm(makeEmpty(nextCountry));
      }
      setDraftRevision(typeof body.document?.draftRevision === "number" ? body.document.draftRevision : null);
      setPublishedRevision(typeof body.document?.publishedRevision === "number" ? body.document.publishedRevision : null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Country CMS.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { void load(); }, [load]);

  async function upload(file: File) {
    if (working) return;
    setWorking(true); setMessage(""); setError("");
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

      setMessage("Image uploaded and verified. You can now assign it to the Country content.");
      await load();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally { setWorking(false); }
  }

  async function saveDraft() {
    if (!form || working) return;
    setWorking(true); setMessage(""); setError("");
    try {
      const response = await fetch(`/api/admin/cms/countries/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to save Country draft.");
      setMessage("Country draft saved. Public page is unchanged until Publish.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save Country draft.");
    } finally { setWorking(false); }
  }

  async function publish() {
    if (!form || working) return;
    setWorking(true); setMessage(""); setError("");
    try {
      const response = await fetch(`/api/admin/cms/countries/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to publish Country content.");
      setMessage("Country content published successfully.");
      await load();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Unable to publish Country content.");
    } finally { setWorking(false); }
  }

  function moveImage(index: number, direction: -1 | 1) {
    if (!form) return;
    const target = index + direction;
    if (target < 0 || target >= form.culturalImageAssetIds.length) return;
    const next = [...form.culturalImageAssetIds];
    [next[index], next[target]] = [next[target], next[index]];
    setForm({ ...form, culturalImageAssetIds: next });
  }

  if (loading || !form || !country) {
    return <main className="min-h-screen bg-[var(--background)]"><div className="mx-auto max-w-6xl px-6 py-16 text-sm text-[var(--text-secondary)]">Loading Country CMS…</div></main>;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-6 md:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Country Content</p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">{country.name_ar} / {country.name_en}</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Content only. Market, currency, and shipping remain separate systems.</p>
          </div>
          <div className="flex gap-2"><Link href="/dashboard-admin/countries" className="btn-secondary">← Countries</Link><Link href={`/country/${country.slug}`} className="btn-secondary">Public page</Link></div>
        </div>

        {message && <div className="mt-5 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-5 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        <p className="mt-5 text-xs text-[var(--text-muted)]">Draft r{draftRevision ?? "—"} · Published r{publishedRevision ?? "—"} · Country status: {country.is_active ? "Active" : "Inactive"}</p>

        <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-7">
          <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Identity & cultural summary</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="text-sm">الاسم الظاهر بالعربي<input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" dir="rtl" /></label>
            <label className="text-sm">English display name<input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" /></label>
            <label className="text-sm">الملخص الثقافي بالعربي<textarea value={form.summaryAr} onChange={(e) => setForm({ ...form, summaryAr: e.target.value })} rows={8} maxLength={4000} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" dir="rtl" /></label>
            <label className="text-sm">English cultural summary<textarea value={form.summaryEn} onChange={(e) => setForm({ ...form, summaryEn: e.target.value })} rows={8} maxLength={4000} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" /></label>
          </div>
        </section>

        <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-7">
          <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Media</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">JPEG / PNG / WebP · 5 MB per image. The editorial maximum number of cultural images has not been fixed yet.</p>
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={working} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} className="mt-4 block w-full text-sm" />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="text-sm">Cover Image<select value={form.coverImageAssetId ?? ""} onChange={(e) => setForm({ ...form, coverImageAssetId: e.target.value || null })} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3"><option value="">None</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.mimeType} · {asset.id.slice(0, 8)}</option>)}</select></label>
            <label className="text-sm">Open Graph Image<select value={form.seo.ogImageAssetId ?? ""} onChange={(e) => setForm({ ...form, seo: { ...form.seo, ogImageAssetId: e.target.value || null } })} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3"><option value="">None</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.mimeType} · {asset.id.slice(0, 8)}</option>)}</select></label>
          </div>

          {form.coverImageAssetId && assetMap.get(form.coverImageAssetId)?.previewUrl && <img src={assetMap.get(form.coverImageAssetId)?.previewUrl ?? ""} alt="Country cover preview" className="mt-5 max-h-72 w-full rounded-[var(--radius-lg)] object-cover" />}

          <div className="mt-7">
            <div className="flex items-center justify-between gap-4"><h3 className="font-medium text-[var(--color-espresso)]">Cultural images</h3><select value="" onChange={(e) => { const id = e.target.value; if (id && !form.culturalImageAssetIds.includes(id)) setForm({ ...form, culturalImageAssetIds: [...form.culturalImageAssetIds, id] }); }} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-3 py-2 text-sm"><option value="">Add image…</option>{assets.filter((asset) => !form.culturalImageAssetIds.includes(asset.id)).map((asset) => <option key={asset.id} value={asset.id}>{asset.mimeType} · {asset.id.slice(0, 8)}</option>)}</select></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{form.culturalImageAssetIds.map((id, index) => { const asset = assetMap.get(id); return <div key={id} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] p-3">{asset?.previewUrl ? <img src={asset.previewUrl} alt="Cultural preview" className="aspect-[4/3] w-full rounded object-cover" /> : <div className="aspect-[4/3] rounded bg-[var(--surface-muted)]" />}<div className="mt-3 flex gap-2"><button type="button" onClick={() => moveImage(index, -1)} className="text-xs" disabled={index === 0}>↑</button><button type="button" onClick={() => moveImage(index, 1)} className="text-xs" disabled={index === form.culturalImageAssetIds.length - 1}>↓</button><button type="button" onClick={() => setForm({ ...form, culturalImageAssetIds: form.culturalImageAssetIds.filter((item) => item !== id) })} className="ml-auto text-xs text-red-600">Remove</button></div></div>; })}</div>
          </div>
        </section>

        <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-7">
          <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">SEO Basics</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="text-sm">SEO title Arabic<input value={form.seo.titleAr} onChange={(e) => setForm({ ...form, seo: { ...form.seo, titleAr: e.target.value } })} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" /></label>
            <label className="text-sm">SEO title English<input value={form.seo.titleEn} onChange={(e) => setForm({ ...form, seo: { ...form.seo, titleEn: e.target.value } })} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" /></label>
            <label className="text-sm">Meta description Arabic<textarea value={form.seo.metaDescriptionAr} onChange={(e) => setForm({ ...form, seo: { ...form.seo, metaDescriptionAr: e.target.value } })} rows={3} maxLength={320} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" /></label>
            <label className="text-sm">Meta description English<textarea value={form.seo.metaDescriptionEn} onChange={(e) => setForm({ ...form, seo: { ...form.seo, metaDescriptionEn: e.target.value } })} rows={3} maxLength={320} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" /></label>
          </div>
        </section>

        <div className="sticky bottom-4 mt-8 flex gap-3 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]"><button disabled={working} onClick={() => void saveDraft()} className="btn-secondary">Save Draft</button><button disabled={working || draftRevision === null} onClick={() => void publish()} className="btn-primary">Publish</button></div>
      </section>
    </main>
  );
}

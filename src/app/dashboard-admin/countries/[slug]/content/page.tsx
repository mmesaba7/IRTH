"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";

type Asset = {
  id: string;
  mimeType: string;
  fileSizeBytes: number;
  previewUrl: string | null;
};

type VideoAsset = {
  id: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds: number;
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
  introVideoAssetId: string | null;
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
    introVideoAssetId: null,
    seo: {
      titleAr: country.name_ar,
      titleEn: country.name_en,
      metaDescriptionAr: "",
      metaDescriptionEn: "",
      ogImageAssetId: null,
    },
  };
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(duration) || duration <= 0) reject(new Error("Unable to read video duration."));
      else resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read video metadata."));
    };
    video.src = url;
  });
}

export default function CountryContentPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [country, setCountry] = useState<Country | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [form, setForm] = useState<CountryForm | null>(null);
  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [publishedRevision, setPublishedRevision] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const assetMap = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const videoMap = useMemo(() => new Map(videos.map((video) => [video.id, video])), [videos]);

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
      setVideos(Array.isArray(body.videos) ? body.videos : []);

      const draftPayload = body.document?.draftPayload;
      if (draftPayload && typeof draftPayload === "object") {
        const draft = draftPayload as Partial<CountryForm>;
        setForm({
          ...makeEmpty(nextCountry),
          ...draft,
          introVideoAssetId: typeof draft.introVideoAssetId === "string" ? draft.introVideoAssetId : null,
          seo: { ...makeEmpty(nextCountry).seo, ...(draft.seo ?? {}) },
        });
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

  async function refreshMediaOnly() {
    const response = await fetch(`/api/admin/cms/countries/${encodeURIComponent(slug)}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error || "Unable to refresh Country media.");
    setAssets(Array.isArray(body.assets) ? body.assets : []);
    setVideos(Array.isArray(body.videos) ? body.videos : []);
  }

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

      await refreshMediaOnly();
      setMessage("New image uploaded from your device and verified. Your unsaved Country text was preserved; the image is now available below.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally { setWorking(false); }
  }

  async function uploadVideo(file: File) {
    if (working || !form) return;
    setWorking(true); setVideoProgress(0); setMessage(""); setError("");
    try {
      if (file.type !== "video/mp4") throw new Error("Country introduction video must be MP4.");
      if (file.size > 250 * 1024 * 1024) throw new Error("Country introduction video must be 250 MB or smaller.");

      const localDuration = await readVideoDuration(file);
      if (localDuration > 180.25) throw new Error("Country introduction video must be 3 minutes or shorter.");

      const intentResponse = await fetch("/api/admin/cms/video/upload-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType: file.type, fileSize: file.size }),
      });
      const intent = await intentResponse.json();
      if (!intentResponse.ok) throw new Error(intent?.error || "Unable to prepare video upload.");

      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Authentication session is required for video upload.");

      await new Promise<void>((resolve, reject) => {
        const uploader = new tus.Upload(file, {
          endpoint: intent.resumableEndpoint,
          headers: { authorization: `Bearer ${accessToken}` },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          chunkSize: 6 * 1024 * 1024,
          retryDelays: [0, 1000, 3000, 5000],
          metadata: {
            bucketName: intent.bucketName,
            objectName: intent.storagePath,
            contentType: "video/mp4",
            cacheControl: "3600",
          },
          onProgress: (uploaded, total) => setVideoProgress(total > 0 ? Math.round((uploaded / total) * 100) : 0),
          onError: reject,
          onSuccess: () => resolve(),
        });
        uploader.start();
      });

      const finalizeResponse = await fetch("/api/admin/cms/video/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: intent.assetId }),
      });
      const finalized = await finalizeResponse.json();
      if (!finalizeResponse.ok) throw new Error(finalized?.error || "Unable to verify video.");

      await refreshMediaOnly();
      setForm((current) => current ? { ...current, introVideoAssetId: intent.assetId } : current);
      setMessage("Country introduction video uploaded, verified, and selected. Save Draft, then Publish when ready.");
    } catch (videoError) {
      setError(videoError instanceof Error ? videoError.message : "Video upload failed.");
    } finally {
      setVideoProgress(null);
      setWorking(false);
    }
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

  const selectedVideo = form.introVideoAssetId ? videoMap.get(form.introVideoAssetId) : null;

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
          <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Country introduction video</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">One optional MP4 video · maximum 3 minutes · maximum 250 MB · private resumable upload. It stays private until the Country Draft is published.</p>
          <label className="mt-5 block rounded-[var(--radius-md)] border border-dashed border-[var(--border-soft)] bg-[var(--surface-muted)] p-5 text-sm">
            <span className="font-medium text-[var(--color-espresso)]">Upload introduction video from your device</span>
            <input type="file" accept="video/mp4" disabled={working} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadVideo(file); event.currentTarget.value = ""; }} className="mt-3 block w-full text-sm" />
            {videoProgress !== null && <p className="mt-3 text-xs text-[var(--color-copper)]">Uploading… {videoProgress}%</p>}
          </label>

          <label className="mt-5 block text-sm">Selected introduction video
            <select value={form.introVideoAssetId ?? ""} onChange={(e) => setForm({ ...form, introVideoAssetId: e.target.value || null })} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3">
              <option value="">None</option>
              {videos.map((video) => <option key={video.id} value={video.id}>MP4 · {Math.round(video.durationSeconds)}s · {(video.fileSizeBytes / 1024 / 1024).toFixed(1)} MB</option>)}
            </select>
          </label>
          {selectedVideo?.previewUrl && <video src={selectedVideo.previewUrl} controls preload="metadata" className="mt-5 w-full max-w-3xl rounded-[var(--radius-lg)] bg-black" />}
        </section>

        <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-7">
          <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Images</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Upload a new image directly from your device, or reuse an existing CMS image. JPEG / PNG / WebP · 5 MB per image. The editorial maximum number of cultural images has not been fixed yet.</p>
          <label className="mt-5 block rounded-[var(--radius-md)] border border-dashed border-[var(--border-soft)] bg-[var(--surface-muted)] p-5 text-sm">
            <span className="font-medium text-[var(--color-espresso)]">Upload new image from your device</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={working} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} className="mt-3 block w-full text-sm" />
          </label>

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
          <p className="mt-2 text-xs text-[var(--text-muted)]">SEO fields are optional. If left empty, IRTH uses the Country display name and cultural summary automatically.</p>
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

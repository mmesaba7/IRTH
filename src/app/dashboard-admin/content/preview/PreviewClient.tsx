"use client";

import { useEffect, useState } from "react";

type PreviewDocument = {
  key: string;
  contentType: string;
  draftRevision: number | null;
  publishedRevision: number | null;
  previewSource: "draft" | "published";
  payload: Record<string, unknown>;
};

type PreviewResponse = {
  document: PreviewDocument;
  media: Record<string, string | null>;
};

const PRESETS = [
  ["Homepage", "homepage"],
  ["Brand", "brand"],
  ["Help", "help:main"],
  ["Contact", "contact:main"],
  ["Footer", "footer:main"],
  ["Campaign", "campaign:main"],
] as const;

function str(record: Record<string, unknown>, key: string) {
  return typeof record[key] === "string" ? record[key] as string : "";
}

function nullableStr(record: Record<string, unknown>, key: string) {
  return typeof record[key] === "string" ? record[key] as string : null;
}

function MediaImage({ id, media, className = "" }: { id: string | null; media: Record<string, string | null>; className?: string }) {
  if (!id || !media[id]) return null;
  return <img src={media[id] ?? ""} alt="CMS preview" className={className} />;
}

function renderPreview(document: PreviewDocument, media: Record<string, string | null>) {
  const p = document.payload;

  if (document.contentType === "campaign") {
    const imageId = nullableStr(p, "backgroundImageAssetId");
    return <section className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-espresso)] p-8 text-[var(--color-ivory)] md:p-12">
      {imageId && media[imageId] ? <img src={media[imageId] ?? ""} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" /> : null}
      <div className="relative z-10 grid gap-8 md:grid-cols-2"><div dir="rtl"><p className="text-xs text-[var(--color-copper)]">Campaign Preview</p><h2 className="mt-3 font-[var(--font-display)] text-4xl">{str(p, "titleAr")}</h2><p className="mt-4 leading-8">{str(p, "bodyAr")}</p>{str(p, "ctaLabelAr") && str(p, "ctaUrl") ? <span className="btn-primary mt-6 inline-flex">{str(p, "ctaLabelAr")}</span> : null}</div><div dir="ltr"><p className="text-xs text-[var(--color-copper)]">{str(p, "startAt")} → {str(p, "endAt")}</p><h2 className="mt-3 font-[var(--font-display)] text-4xl">{str(p, "titleEn")}</h2><p className="mt-4 leading-8">{str(p, "bodyEn")}</p>{str(p, "ctaLabelEn") && str(p, "ctaUrl") ? <span className="btn-primary mt-6 inline-flex">{str(p, "ctaLabelEn")}</span> : null}</div></div>
    </section>;
  }

  if (document.contentType === "help") {
    const faqs = Array.isArray(p.faqs) ? p.faqs as Array<Record<string, unknown>> : [];
    return <section><div className="grid gap-8 md:grid-cols-2"><div dir="rtl"><h2 className="font-[var(--font-display)] text-4xl">{str(p, "titleAr")}</h2><p className="mt-4 text-[var(--text-secondary)]">{str(p, "introAr")}</p></div><div><h2 className="font-[var(--font-display)] text-4xl">{str(p, "titleEn")}</h2><p className="mt-4 text-[var(--text-secondary)]">{str(p, "introEn")}</p></div></div><div className="mt-8 space-y-3">{faqs.map((faq, index) => <div key={str(faq, "id") || index} className="rounded-lg border border-[var(--border-soft)] p-4"><p dir="rtl" className="font-semibold">{str(faq, "questionAr")}</p><p dir="rtl" className="mt-2 text-sm text-[var(--text-secondary)]">{str(faq, "answerAr")}</p><p className="mt-4 font-semibold">{str(faq, "questionEn")}</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{str(faq, "answerEn")}</p></div>)}</div></section>;
  }

  if (document.contentType === "contact") {
    return <section className="grid gap-8 md:grid-cols-2"><div dir="rtl"><h2 className="font-[var(--font-display)] text-4xl">{str(p, "titleAr")}</h2><p className="mt-4 text-[var(--text-secondary)]">{str(p, "introAr")}</p><div className="mt-6 space-y-2 text-sm"><p>{str(p, "email")}</p><p>{str(p, "phone")}</p><p>{str(p, "whatsapp")}</p><p>{str(p, "addressAr")}</p></div></div><div><h2 className="font-[var(--font-display)] text-4xl">{str(p, "titleEn")}</h2><p className="mt-4 text-[var(--text-secondary)]">{str(p, "introEn")}</p><div className="mt-6 space-y-2 text-sm"><p>{str(p, "email")}</p><p>{str(p, "phone")}</p><p>{str(p, "whatsapp")}</p><p>{str(p, "addressEn")}</p></div></div></section>;
  }

  if (document.contentType === "footer") {
    const links = Array.isArray(p.links) ? p.links as Array<Record<string, unknown>> : [];
    return <section className="rounded-[var(--radius-xl)] bg-[var(--color-espresso)] p-8 text-[var(--color-ivory)]"><div className="grid gap-8 md:grid-cols-2"><div dir="rtl"><h2 className="font-[var(--font-display)] text-3xl">IRTH</h2><p className="mt-3 text-sm opacity-70">{str(p, "summaryAr")}</p></div><div><h2 className="font-[var(--font-display)] text-3xl">IRTH</h2><p className="mt-3 text-sm opacity-70">{str(p, "summaryEn")}</p></div></div><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{links.filter((link) => link.visible !== false).map((link, index) => <div key={str(link, "id") || index} className="rounded-lg border border-white/10 p-3 text-sm"><p>{str(link, "labelAr")} / {str(link, "labelEn")}</p><p className="mt-1 text-xs opacity-50">{str(link, "url")}</p></div>)}</div></section>;
  }

  if (document.contentType === "blog_post") {
    const coverId = nullableStr(p, "coverImageAssetId");
    return <article><MediaImage id={coverId} media={media} className="aspect-[16/9] w-full rounded-[var(--radius-xl)] object-cover" /><div className="mt-8 grid gap-10 md:grid-cols-2"><div dir="rtl"><h2 className="font-[var(--font-display)] text-4xl">{str(p, "titleAr")}</h2><p className="mt-4 font-medium text-[var(--text-secondary)]">{str(p, "excerptAr")}</p><div className="mt-6 whitespace-pre-wrap leading-8">{str(p, "bodyAr")}</div></div><div><h2 className="font-[var(--font-display)] text-4xl">{str(p, "titleEn")}</h2><p className="mt-4 font-medium text-[var(--text-secondary)]">{str(p, "excerptEn")}</p><div className="mt-6 whitespace-pre-wrap leading-8">{str(p, "bodyEn")}</div></div></div></article>;
  }

  if (document.contentType === "static_page") {
    return <article className="grid gap-10 md:grid-cols-2"><div dir="rtl"><h2 className="font-[var(--font-display)] text-4xl">{str(p, "titleAr")}</h2><div className="mt-6 whitespace-pre-wrap leading-8">{str(p, "bodyAr")}</div></div><div><h2 className="font-[var(--font-display)] text-4xl">{str(p, "titleEn")}</h2><div className="mt-6 whitespace-pre-wrap leading-8">{str(p, "bodyEn")}</div></div></article>;
  }

  if (document.contentType === "country_content") {
    const coverId = nullableStr(p, "coverImageAssetId");
    const cultural = Array.isArray(p.culturalImageAssetIds) ? p.culturalImageAssetIds.filter((id): id is string => typeof id === "string") : [];
    const videoId = nullableStr(p, "introVideoAssetId");
    return <section><MediaImage id={coverId} media={media} className="aspect-[16/7] w-full rounded-[var(--radius-xl)] object-cover" /><div className="mt-8 grid gap-8 md:grid-cols-2"><div dir="rtl"><h2 className="font-[var(--font-display)] text-4xl">{str(p, "nameAr")}</h2><p className="mt-4 leading-8 text-[var(--text-secondary)]">{str(p, "summaryAr")}</p></div><div><h2 className="font-[var(--font-display)] text-4xl">{str(p, "nameEn")}</h2><p className="mt-4 leading-8 text-[var(--text-secondary)]">{str(p, "summaryEn")}</p></div></div>{videoId && media[videoId] ? <video controls src={media[videoId] ?? ""} className="mt-8 w-full rounded-xl" /> : null}<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cultural.map((id) => <MediaImage key={id} id={id} media={media} className="aspect-[4/3] w-full rounded-lg object-cover" />)}</div></section>;
  }

  if (document.contentType === "homepage") {
    const sections = Array.isArray(p.sections) ? p.sections as Array<Record<string, unknown>> : [];
    return <section><h2 className="font-[var(--font-display)] text-3xl">Homepage structure</h2><div className="mt-6 space-y-3">{sections.sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)).map((section, index) => <div key={str(section, "key") || index} className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] p-4"><span>{Number(section.order ?? index + 1)}. {str(section, "key")}</span><span className="text-xs">{section.visible === false ? "Hidden" : "Visible"}</span></div>)}</div></section>;
  }

  if (document.contentType === "brand") {
    const assetEntries = Object.entries(p).filter(([key, value]) => /AssetId$/.test(key) && typeof value === "string") as Array<[string, string]>;
    return <section><h2 className="font-[var(--font-display)] text-3xl">Brand assets</h2><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{assetEntries.map(([key, id]) => <div key={key} className="rounded-lg border border-[var(--border-soft)] p-4"><p className="mb-3 text-sm font-medium">{key}</p><MediaImage id={id} media={media} className="aspect-[4/3] w-full rounded-lg object-contain" /></div>)}</div></section>;
  }

  return <pre className="overflow-auto rounded-lg bg-[var(--surface-muted)] p-5 text-xs">{JSON.stringify(p, null, 2)}</pre>;
}

export default function PreviewClient({ initialKey }: { initialKey: string }) {
  const [key, setKey] = useState(initialKey || "help:main");
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(nextKey = key) {
    setLoading(true); setError(""); setData(null);
    try {
      const response = await fetch(`/api/admin/cms/preview?key=${encodeURIComponent(nextKey)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load preview.");
      setData(body as PreviewResponse);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load preview."); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (initialKey) void load(initialKey); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>
    <div className="flex flex-wrap gap-2">{PRESETS.map(([label, value]) => <button key={value} onClick={() => { setKey(value); void load(value); }} className="btn-secondary">{label}</button>)}</div>
    <div className="mt-5 flex flex-col gap-3 sm:flex-row"><input value={key} onChange={(e) => setKey(e.target.value)} placeholder="blog:example, page:about-irth, country:egypt" className="flex-1 rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2" /><button onClick={() => void load()} className="btn-primary">Preview</button></div>
    <p className="mt-2 text-xs text-[var(--text-muted)]">Dynamic keys: blog:&lt;slug&gt; · page:&lt;slug&gt; · country:&lt;slug&gt;</p>
    {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {loading && <p className="mt-8 text-sm text-[var(--text-secondary)]">Loading secure preview…</p>}
    {data && <div className="mt-8"><div className="mb-5 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]"><span>{data.document.key}</span><span>{data.document.contentType}</span><span>Source: {data.document.previewSource}</span><span>Draft r{data.document.draftRevision ?? 0}</span><span>Published r{data.document.publishedRevision ?? 0}</span></div><div className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-8">{renderPreview(data.document, data.media)}</div></div>}
  </>;
}

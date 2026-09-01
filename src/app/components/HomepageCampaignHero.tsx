"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CampaignPayload } from "@/lib/cms/campaign";

type LiveCampaignResponse = {
  campaign: CampaignPayload | null;
  backgroundImageUrl: string | null;
};

function DefaultHero() {
  return (
    <section className="relative overflow-hidden bg-[var(--color-espresso)] text-[var(--color-ivory)]">
      <div className="absolute inset-0 opacity-[0.08]">
        <div className="absolute left-[8%] top-14 h-28 w-28 rounded-full border border-[var(--color-copper)]" />
        <div className="absolute bottom-14 right-[8%] h-20 w-20 rotate-45 border border-[var(--color-copper)]" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-copper)]" />
      </div>
      <div className="relative z-10 mx-auto grid max-w-[var(--container-max)] gap-12 px-5 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:px-6 md:py-24 lg:py-28">
        <div className="max-w-3xl">
          <p className="section-eyebrow">Heritage · Craft · Human</p>
          <h1 className="mt-5 max-w-3xl font-[var(--font-display)] text-5xl font-normal leading-[1.02] md:text-6xl lg:text-7xl">Discover the hands<br className="hidden sm:block" /> behind the heritage.</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-ivory)]/70 md:text-lg">Explore authentic handmade work, meet the artisans who preserve traditional knowledge, and discover the places and stories behind every piece.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/explore" className="btn-primary">Discover IRTH <span aria-hidden="true">→</span></Link><Link href="/crafts" className="btn-secondary-inverse">Shop crafts</Link></div>
        </div>
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[420px]"><div className="absolute inset-0 rotate-3 rounded-[var(--radius-xl)] bg-[var(--color-copper)]/20" /><div className="absolute inset-5 -rotate-2 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ivory)]/15 bg-[var(--color-olive)]"><div className="absolute inset-0 flex items-center justify-center"><div className="relative h-48 w-36 rounded-[42%_42%_36%_36%] bg-[var(--color-ivory)]/85 shadow-[var(--shadow-elevated)]"><div className="absolute left-1/2 top-[-18px] h-14 w-16 -translate-x-1/2 rounded-full bg-[var(--color-ivory)]/85" /></div></div><div className="absolute bottom-6 left-6 right-6 rounded-[var(--radius-md)] bg-[var(--color-espresso)]/85 p-4 backdrop-blur-sm"><p className="text-xs uppercase tracking-[0.16em] text-[var(--color-copper)]">Made by hand</p><p className="mt-1 font-[var(--font-display)] text-xl text-[var(--color-ivory)]">Objects shaped by place, memory, and craft.</p></div></div></div>
      </div>
    </section>
  );
}

export default function HomepageCampaignHero() {
  const [data, setData] = useState<LiveCampaignResponse | null>(null);
  const [locale, setLocale] = useState<"ar" | "en">("ar");

  useEffect(() => {
    const saved = localStorage.getItem("irth-locale");
    setLocale(saved === "en" ? "en" : "ar");

    const controller = new AbortController();
    fetch("/api/campaign", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : { campaign: null, backgroundImageUrl: null })
      .then((body) => { if (!controller.signal.aborted) setData(body as LiveCampaignResponse); })
      .catch(() => { if (!controller.signal.aborted) setData({ campaign: null, backgroundImageUrl: null }); });
    return () => controller.abort();
  }, []);

  const campaign = data?.campaign;
  if (!campaign) return <DefaultHero />;

  const isArabic = locale === "ar";
  const title = isArabic ? campaign.titleAr : campaign.titleEn;
  const body = isArabic ? campaign.bodyAr : campaign.bodyEn;
  const ctaLabel = isArabic ? campaign.ctaLabelAr : campaign.ctaLabelEn;
  const ctaUrl = campaign.ctaUrl;
  const external = Boolean(ctaUrl && /^https:\/\//i.test(ctaUrl));

  return (
    <section className="relative overflow-hidden bg-[var(--color-espresso)] text-[var(--color-ivory)]">
      {data?.backgroundImageUrl ? <img src={data.backgroundImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" /> : null}
      <div className="absolute inset-0 bg-[var(--color-espresso)]/35" />
      <div className="relative z-10 mx-auto max-w-[var(--container-max)] px-5 py-20 md:px-6 md:py-28">
        <div className="max-w-3xl" dir={isArabic ? "rtl" : "ltr"}>
          <p className="section-eyebrow">IRTH Campaign</p>
          <h1 className="mt-5 font-[var(--font-display)] text-5xl leading-tight md:text-6xl lg:text-7xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-ivory)]/80 md:text-lg">{body}</p>
          {ctaLabel && ctaUrl ? (
            external
              ? <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-8 inline-flex">{ctaLabel}</a>
              : <Link href={ctaUrl} className="btn-primary mt-8 inline-flex">{ctaLabel}</Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

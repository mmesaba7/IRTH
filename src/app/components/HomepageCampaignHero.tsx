"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CampaignPayload } from "@/lib/cms/campaign";

type LiveCampaignResponse = {
  campaign: CampaignPayload | null;
  backgroundImageUrl: string | null;
};

function DefaultHero({ locale }: { locale: "ar" | "en" }) {
  const isArabic = locale === "ar";

  return (
    <section className="relative isolate min-h-[590px] overflow-hidden bg-[var(--color-petrol-deep)] text-[var(--color-ivory)] md:min-h-[650px]">
      <img
        src="/api/homepage/country-cover/egypt"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,44,56,.94)_0%,rgba(6,44,56,.78)_38%,rgba(6,44,56,.25)_72%,rgba(6,44,56,.12)_100%)] rtl:bg-[linear-gradient(270deg,rgba(6,44,56,.94)_0%,rgba(6,44,56,.78)_38%,rgba(6,44,56,.25)_72%,rgba(6,44,56,.12)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(6,44,56,.45),transparent_48%)]" />
      <div className="irth-pattern absolute -left-24 -top-24 h-72 w-72 rotate-12 rounded-full opacity-30" />

      <div className="relative z-10 mx-auto flex min-h-[590px] max-w-[var(--container-max)] items-end px-5 pb-16 pt-20 md:min-h-[650px] md:items-center md:px-6 md:pb-20 md:pt-24">
        <div className="max-w-[690px]" dir={isArabic ? "rtl" : "ltr"}>
          <p className="section-eyebrow !text-[var(--color-antique-gold)]">
            {isArabic ? "تراث · حرفة · إنسان" : "Heritage · Craft · Human"}
          </p>
          <h1 className="mt-5 font-[var(--font-display)] text-[3.35rem] font-semibold leading-[.98] text-[#fff7e7] sm:text-6xl md:text-7xl lg:text-[5.4rem]">
            {isArabic ? "حِرَف أصيلة، تحكي قصصًا لا تزول." : "Handmade heritage. Timeless stories."}
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-8 text-[var(--color-ivory)]/78 md:text-lg">
            {isArabic
              ? "اكتشف قطعًا مصنوعة باليد، وتعرّف على الحرفيين والأماكن والقصص التي تمنح كل قطعة معناها."
              : "Explore authentic handmade work, meet the artisans who preserve traditional knowledge, and discover the places and stories behind every piece."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/explore" className="btn-primary">
              {isArabic ? "اكتشف إرث" : "Discover IRTH"}
            </Link>
            <Link href="/crafts" className="btn-secondary-inverse">
              {isArabic ? "تسوّق حسب الحرفة" : "Shop crafts"}
            </Link>
          </div>
        </div>
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
  if (!campaign) return <DefaultHero locale={locale} />;

  const isArabic = locale === "ar";
  const title = isArabic ? campaign.titleAr : campaign.titleEn;
  const body = isArabic ? campaign.bodyAr : campaign.bodyEn;
  const ctaLabel = isArabic ? campaign.ctaLabelAr : campaign.ctaLabelEn;
  const ctaUrl = campaign.ctaUrl;
  const external = Boolean(ctaUrl && /^https:\/\//i.test(ctaUrl));

  return (
    <section className="relative isolate min-h-[570px] overflow-hidden bg-[var(--color-petrol-deep)] text-[var(--color-ivory)] md:min-h-[630px]">
      {data?.backgroundImageUrl ? (
        <img src={data.backgroundImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,44,56,.94),rgba(6,44,56,.64)_55%,rgba(6,44,56,.25))] rtl:bg-[linear-gradient(270deg,rgba(6,44,56,.94),rgba(6,44,56,.64)_55%,rgba(6,44,56,.25))]" />
      <div className="relative z-10 mx-auto flex min-h-[570px] max-w-[var(--container-max)] items-center px-5 py-20 md:min-h-[630px] md:px-6 md:py-28">
        <div className="max-w-3xl" dir={isArabic ? "rtl" : "ltr"}>
          <p className="section-eyebrow !text-[var(--color-antique-gold)]">IRTH Campaign</p>
          <h1 className="mt-5 font-[var(--font-display)] text-5xl font-semibold leading-[1.02] text-[#fff7e7] md:text-6xl lg:text-7xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-ivory)]/82 md:text-lg">{body}</p>
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

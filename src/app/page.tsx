"use client";

import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Header from "./components/Header";
import HomepageCampaignHero from "./components/HomepageCampaignHero";
import BestSellersSection from "./components/BestSellersSection";
import BlogHighlightsSection from "./components/BlogHighlightsSection";
import NewArrivalsSection from "./components/NewArrivalsSection";
import ProductCard from "./components/ProductCard";
import IrthIcon, { type IrthIconName } from "./components/IrthIcon";
import type { Product } from "./data/products";
import { publicCountries } from "./data/countries";
import { createClient } from "@/lib/supabase/client";

type DbCountry = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
};

type DbCraft = {
  id: string;
  name_ar: string;
  name_en: string;
};

type DbArtisan = {
  id: string;
  slug: string;
  name_ar: string | null;
  name_en: string;
  country_id: string;
  region_ar: string | null;
  region_en: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  story_ar: string | null;
  story_en: string | null;
  primary_craft_id: string;
  profile_image_url: string | null;
};

type DbProduct = {
  id: string;
  slug: string;
  artisan_id: string;
  primary_craft_id: string;
  name_ar: string | null;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  story_ar: string | null;
  story_en: string | null;
  material_ar: string | null;
  material_en: string | null;
  price: number | string;
  dimensions: string | null;
  weight: string | null;
  made_to_order: boolean;
  preparation_time: string | null;
  one_of_a_kind: boolean;
  customization: boolean;
};

type HomeCountry = {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  heroImage?: string;
};

type HomeCraft = {
  id: string;
  name: string;
  filterName: string;
};

type HomeArtisan = {
  id: string;
  slug: string;
  name: string;
  country: string;
  region: string;
  mainCraft: string;
  bio: string;
  story: string;
  profileImage: string | null;
};

type HomeOfferRow = {
  promotion_id: string;
  source_type: "irth" | "artisan";
  discount_type: "percentage" | "fixed";
  discount_value: number | string;
  start_at: string;
  end_at: string;
  product_id: string;
  product_slug: string;
  product_name_ar: string | null;
  product_name_en: string;
  product_price: number | string;
  artisan_slug: string;
  artisan_name_ar: string | null;
  artisan_name_en: string;
  craft_name_ar: string | null;
  craft_name_en: string;
  country_name_ar: string | null;
  country_name_en: string;
};

type HomeOffer = HomeOfferRow & {
  currency_code: string;
  original_line_total: string;
  promotion_discount: string;
  final_line_total: string;
};

type SecureOfferQuote = {
  market: { currency_code: string };
  items: Array<{
    slug: string;
    status: string;
    originalLineTotal: string | null;
    lineTotal: string | null;
    promotionDiscount: string | null;
    promotion: null | { id: string };
  }>;
};

type HomepageSectionConfig = {
  key: string;
  visible: boolean;
  order: number;
};

const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionConfig[] = [
  { key: "hero", visible: true, order: 1 },
  { key: "crafts", visible: true, order: 2 },
  { key: "explore_countries", visible: true, order: 3 },
  { key: "featured_products", visible: true, order: 4 },
  { key: "best_sellers", visible: true, order: 5 },
  { key: "new_arrivals", visible: true, order: 6 },
  { key: "featured_artisans", visible: true, order: 7 },
  { key: "promotions", visible: true, order: 8 },
  { key: "recently_viewed", visible: true, order: 9 },
  { key: "story_brand", visible: true, order: 10 },
  { key: "wholesale_cta", visible: true, order: 11 },
  { key: "trust_value", visible: true, order: 12 },
  { key: "blog_highlights", visible: true, order: 13 },
  { key: "footer", visible: true, order: 14 },
];

function formatMoney(value: number | string, currencyCode: string) {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: currencyCode,
  }).format(Number(value));
}

function parsePublishedHomepageSections(value: unknown): HomepageSectionConfig[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = (value as Record<string, unknown>).payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const sections = (payload as Record<string, unknown>).sections;
  if (!Array.isArray(sections)) return null;

  const allowed = new Set(DEFAULT_HOMEPAGE_SECTIONS.map((section) => section.key));
  const seen = new Set<string>();
  const parsed: HomepageSectionConfig[] = [];

  for (const item of sections) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    const { key, visible, order } = record;
    if (
      typeof key !== "string" ||
      !allowed.has(key) ||
      seen.has(key) ||
      typeof visible !== "boolean" ||
      typeof order !== "number" ||
      !Number.isInteger(order) ||
      order < 1
    ) {
      return null;
    }
    seen.add(key);
    parsed.push({ key, visible, order });
  }

  if (seen.size !== allowed.size) return null;
  return parsed.sort((a, b) => a.order - b.order);
}

function craftIconName(value: string): IrthIconName {
  const craft = value.toLowerCase();
  if (craft.includes("text") || craft.includes("weav") || craft.includes("fabric")) return "textile";
  if (craft.includes("pot") || craft.includes("ceramic") || craft.includes("clay")) return "pottery";
  if (craft.includes("metal") || craft.includes("copper") || craft.includes("brass")) return "metal";
  if (craft.includes("wood")) return "wood";
  if (craft.includes("leather")) return "leather";
  if (craft.includes("jewel") || craft.includes("silver") || craft.includes("gold")) return "jewelry";
  return "craft";
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [countries, setCountries] = useState<HomeCountry[]>([]);
  const [crafts, setCrafts] = useState<HomeCraft[]>([]);
  const [artisans, setArtisans] = useState<HomeArtisan[]>([]);
  const [offers, setOffers] = useState<HomeOffer[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSectionConfig[]>(DEFAULT_HOMEPAGE_SECTIONS);
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLocale(localStorage.getItem("irth-locale") === "en" ? "en" : "ar");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHomepage() {
      setLoading(true);
      setError("");

      let selectedMarketId: string | null = null;

      try {
        const marketResponse = await fetch("/api/market-selection", { cache: "no-store" });
        if (marketResponse.ok) {
          const marketPayload = (await marketResponse.json()) as { market?: { id?: unknown } | null };
          selectedMarketId = typeof marketPayload.market?.id === "string" ? marketPayload.market.id : null;
        }
      } catch {
        selectedMarketId = null;
      }

      const offersPromise = selectedMarketId
        ? supabase.rpc("get_active_promotions", { p_market_id: selectedMarketId })
        : Promise.resolve({ data: [], error: null });

      const cmsPromise = fetch("/api/cms/homepage", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) return { data: null, error: new Error(`CMS request failed: ${response.status}`) };
          const payload = (await response.json()) as { document?: unknown };
          return { data: payload.document ?? null, error: null };
        })
        .catch((cmsError: unknown) => ({ data: null, error: cmsError }));

      const [countriesResult, craftsResult, artisansResult, productsResult, offersResult, cmsResult] = await Promise.all([
        supabase.from("countries").select("id, slug, name_ar, name_en").eq("is_active", true).order("name_en", { ascending: true }),
        supabase.from("crafts").select("id, name_ar, name_en").eq("is_active", true).order("name_en", { ascending: true }),
        supabase.from("artisan_profiles").select("id, slug, name_ar, name_en, country_id, region_ar, region_en, bio_ar, bio_en, story_ar, story_en, primary_craft_id, profile_image_url").eq("status", "active").order("slug", { ascending: true }),
        supabase.from("products").select("id, slug, artisan_id, primary_craft_id, name_ar, name_en, description_ar, description_en, story_ar, story_en, material_ar, material_en, price, dimensions, weight, made_to_order, preparation_time, one_of_a_kind, customization").eq("lifecycle_status", "published").order("created_at", { ascending: false }),
        offersPromise,
        cmsPromise,
      ]);

      if (cancelled) return;

      if (countriesResult.error || craftsResult.error || artisansResult.error || productsResult.error) {
        console.error("Could not load homepage marketplace data:", {
          countries: countriesResult.error,
          crafts: craftsResult.error,
          artisans: artisansResult.error,
          products: productsResult.error,
        });
        setError("تعذر تحميل بيانات المتجر حاليًا.");
        setLoading(false);
        return;
      }

      if (offersResult.error) console.error("Could not load active promotions:", offersResult.error);

      if (cmsResult.error) {
        console.error("Could not load published homepage CMS; using safe defaults:", cmsResult.error);
      } else {
        const publishedSections = parsePublishedHomepageSections(cmsResult.data);
        if (publishedSections) setHomepageSections(publishedSections);
        else console.error("Published homepage CMS payload is invalid; using safe defaults.");
      }

      const countryRows = (countriesResult.data ?? []) as DbCountry[];
      const craftRows = (craftsResult.data ?? []) as DbCraft[];
      const artisanRows = (artisansResult.data ?? []) as DbArtisan[];
      const productRows = (productsResult.data ?? []) as DbProduct[];
      const rawOffers = offersResult.error ? [] : ((offersResult.data ?? []) as HomeOfferRow[]);

      let winningOffers: HomeOffer[] = [];
      if (rawOffers.length > 0) {
        const offerSlugs = [...new Set(rawOffers.map((offer) => offer.product_slug))];
        try {
          const quoteResponse = await fetch("/api/cart/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ items: offerSlugs.map((slug) => ({ slug, quantity: 1 })) }),
          });
          if (quoteResponse.ok) {
            const quotePayload = (await quoteResponse.json()) as { quote?: SecureOfferQuote };
            const secureQuote = quotePayload.quote;
            if (secureQuote) {
              const rawOfferByWinnerKey = new Map(rawOffers.map((offer) => [`${offer.promotion_id}:${offer.product_slug}`, offer]));
              winningOffers = secureQuote.items.flatMap((item) => {
                if (item.status !== "available" || !item.promotion || !item.originalLineTotal || !item.lineTotal || !item.promotionDiscount) return [];
                const rawOffer = rawOfferByWinnerKey.get(`${item.promotion.id}:${item.slug}`);
                if (!rawOffer) return [];
                return [{
                  ...rawOffer,
                  currency_code: secureQuote.market.currency_code,
                  original_line_total: item.originalLineTotal,
                  promotion_discount: item.promotionDiscount,
                  final_line_total: item.lineTotal,
                }];
              });
            }
          }
        } catch (quoteError) {
          console.error("Could not resolve winning homepage promotions:", quoteError);
        }
      }

      const countryMap = new Map(countryRows.map((country) => [country.id, country]));
      const craftMap = new Map(craftRows.map((craft) => [craft.id, craft]));
      const visibleArtisanRows = artisanRows.filter((artisan) => countryMap.has(artisan.country_id));
      const artisanMap = new Map(visibleArtisanRows.map((artisan) => [artisan.id, artisan]));

      const mappedCountries: HomeCountry[] = countryRows.map((country) => ({
        id: country.id,
        slug: country.slug,
        name: country.name_ar || country.name_en,
        nameEn: country.name_en,
        heroImage: publicCountries[country.slug]?.heroImage,
      }));

      const mappedCrafts: HomeCraft[] = craftRows.slice(0, 8).map((craft) => ({
        id: craft.id,
        name: craft.name_ar || craft.name_en,
        filterName: craft.name_en,
      }));

      const mappedArtisans: HomeArtisan[] = visibleArtisanRows.slice(0, 3).map((artisan) => {
        const country = countryMap.get(artisan.country_id);
        const craft = craftMap.get(artisan.primary_craft_id);
        return {
          id: artisan.id,
          slug: artisan.slug,
          name: artisan.name_ar || artisan.name_en,
          country: country?.name_ar || country?.name_en || "",
          region: artisan.region_ar || artisan.region_en || country?.name_ar || country?.name_en || "",
          mainCraft: craft?.name_ar || craft?.name_en || "",
          bio: artisan.bio_ar || artisan.bio_en || "",
          story: artisan.story_ar || artisan.story_en || "",
          profileImage: artisan.profile_image_url,
        };
      });

      const accents: Product["accent"][] = ["terracotta", "olive", "copper"];
      const visibleProductRows = productRows.filter((product) => artisanMap.has(product.artisan_id) && craftMap.has(product.primary_craft_id));
      const mappedProducts: Product[] = visibleProductRows.map((product, index) => {
        const artisan = artisanMap.get(product.artisan_id);
        const country = artisan ? countryMap.get(artisan.country_id) : undefined;
        const craft = craftMap.get(product.primary_craft_id);
        const craftName = craft?.name_en || "Craft";
        return {
          id: product.id,
          slug: product.slug,
          artisanSlug: artisan?.slug || "artisan",
          name: product.name_ar || product.name_en,
          artisan: artisan?.name_ar || artisan?.name_en || "IRTH Artisan",
          country: country?.name_ar || country?.name_en || "",
          price: Number(product.price),
          category: craftName,
          accent: accents[index % accents.length],
          origin: artisan?.region_ar || artisan?.region_en || country?.name_ar || country?.name_en || "",
          artisanRole: `${craftName} artisan`,
          objectLabel: craftName,
          description: product.description_ar || product.description_en || "",
          material: product.material_ar || product.material_en || "",
          story: product.story_ar || product.story_en || "",
          status: "approved",
          dimensions: product.dimensions || undefined,
          weight: product.weight || undefined,
          madeToOrder: product.made_to_order,
          preparationTime: product.preparation_time || undefined,
          oneOfAKind: product.one_of_a_kind,
          customization: product.customization,
        };
      });

      const recentlyViewedSlugs = JSON.parse(localStorage.getItem("irth-recently-viewed") || "[]") as string[];
      const recentProducts = recentlyViewedSlugs
        .map((productSlug) => mappedProducts.find((product) => product.slug === productSlug))
        .filter((product): product is Product => Boolean(product))
        .slice(0, 4);

      setCountries(mappedCountries);
      setCrafts(mappedCrafts);
      setArtisans(mappedArtisans);
      setProducts(mappedProducts);
      setRecentlyViewed(recentProducts);
      setOffers(winningOffers.slice(0, 6));
      setLoading(false);
    }

    void loadHomepage();
    return () => { cancelled = true; };
  }, [supabase]);

  const selectedProducts = products.slice(0, 6);
  const featuredArtisan = artisans[0];
  const isArabic = locale === "ar";
  const t = (ar: string, en: string) => isArabic ? ar : en;

  function SearchExperience() {
    return (
      <section className="relative z-20 mx-auto -mt-5 w-full max-w-[var(--container-max)] px-4 md:-mt-8 md:px-6">
        <div className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] md:grid-cols-[1.35fr_.65fr] md:items-center md:p-5">
          <Link href="/search" className="group flex min-h-14 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 transition hover:border-[var(--color-copper)]">
            <IrthIcon name="search" className="h-5 w-5 shrink-0 text-[var(--color-copper)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--color-espresso)]">{t("ابحث عن شيء له معنى", "Find something meaningful")}</p>
              <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{t("منتج، حرفة، حرفي أو دولة...", "Products, crafts, artisans, or countries...")}</p>
            </div>
            <span className="text-[var(--color-copper)] transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">→</span>
          </Link>

          <div className="grid grid-cols-3 gap-2">
            <Link href="/crafts" className="flex flex-col items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-2 text-center text-[11px] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"><IrthIcon name="grid" className="h-5 w-5 text-[var(--color-copper)]" />{t("الحرف", "Crafts")}</Link>
            <Link href="/artisans" className="flex flex-col items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-2 text-center text-[11px] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"><IrthIcon name="user" className="h-5 w-5 text-[var(--color-copper)]" />{t("الحرفيون", "Artisans")}</Link>
            <Link href="/countries" className="flex flex-col items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-2 text-center text-[11px] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"><IrthIcon name="globe" className="h-5 w-5 text-[var(--color-copper)]" />{t("الدول", "Countries")}</Link>
          </div>
        </div>
        {error && <div className="mt-4 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      </section>
    );
  }

  function renderHomepageSection(key: string): ReactNode {
    switch (key) {
      case "hero":
        return <HomepageCampaignHero />;

      case "crafts":
        if (crafts.length === 0) return null;
        return (
          <section className="irth-section">
            <div className="irth-section-heading">
              <div><p className="section-eyebrow">{t("تسوّق حسب الحرفة", "Shop by craft")}</p><h2>{t("ابدأ من الحرفة.", "Begin with the craft.")}</h2></div>
              <Link href="/crafts" className="irth-section-link">{t("كل الحرف", "All crafts")} <span>→</span></Link>
            </div>
            <div className="mt-7 grid auto-cols-[132px] grid-flow-col gap-3 overflow-x-auto pb-2 [scrollbar-width:none] md:grid-flow-row md:grid-cols-4 md:overflow-visible lg:grid-cols-8">
              {crafts.map((craft) => (
                <Link
                  key={craft.id}
                  href={`/crafts?category=${encodeURIComponent(craft.filterName)}`}
                  className="group flex min-h-[118px] flex-col items-center justify-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-4 text-center transition hover:-translate-y-1 hover:border-[var(--color-copper)] hover:shadow-[var(--shadow-soft)]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--color-copper)] transition group-hover:bg-[var(--color-copper)] group-hover:text-white"><IrthIcon name={craftIconName(craft.filterName)} className="h-6 w-6" /></span>
                  <span className="text-xs font-bold leading-5 text-[var(--color-espresso)]">{craft.name}</span>
                </Link>
              ))}
            </div>
          </section>
        );

      case "explore_countries":
        if (countries.length === 0) return null;
        return (
          <section className="border-y border-[var(--border-soft)] bg-[var(--surface-muted)]/58">
            <div className="irth-section">
              <div className="irth-section-heading">
                <div><p className="section-eyebrow">{t("اكتشف المكان", "Explore by place")}</p><h2>{t("لكل مكان حكاية وحرفة.", "Heritage shaped by place.")}</h2></div>
                <Link href="/countries" className="irth-section-link">{t("كل الدول", "All countries")} <span>→</span></Link>
              </div>
              <div className="irth-horizontal-rail mt-8 md:grid-auto-columns-[minmax(250px,30%)] lg:grid-auto-columns-[minmax(235px,23%)]">
                {countries.map((country) => (
                  <Link key={country.id} href={`/country/${country.slug}`} className="group relative min-h-[245px] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-petrol-deep)] text-white shadow-[var(--shadow-soft)]">
                    {country.heroImage ? <img src={country.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" /> : <div className="irth-pattern absolute inset-0 opacity-40" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-petrol-deep)]/90 via-[var(--color-petrol-deep)]/12 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--color-antique-gold)]">{t("دولة", "Country")}</p>
                      <h3 className="mt-1 font-[var(--font-display)] text-3xl font-semibold">{country.name}</h3>
                      <p className="mt-1 text-xs text-white/65">{country.nameEn}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );

      case "featured_products":
        if (selectedProducts.length === 0) return null;
        return (
          <section className="irth-section">
            <div className="irth-section-heading">
              <div><p className="section-eyebrow">{t("مختارات من إرث", "Curated from IRTH")}</p><h2>{t("قطع تحمل أثر صانعها.", "Made to be kept.")}</h2></div>
              <Link href="/crafts" className="irth-section-link">{t("كل المنتجات", "View all")} <span>→</span></Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {selectedProducts.map((product) => <ProductCard key={product.slug} product={product} />)}
            </div>
          </section>
        );

      case "best_sellers": return <BestSellersSection />;
      case "new_arrivals": return <NewArrivalsSection />;

      case "featured_artisans":
        if (!featuredArtisan) return null;
        return (
          <section className="overflow-hidden bg-[var(--color-petrol-deep)] text-[var(--color-ivory)]">
            <div className="mx-auto max-w-[var(--container-max)] px-4 py-12 md:px-6 md:py-16">
              <div className="overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-[var(--color-petrol)] shadow-[var(--shadow-elevated)] md:grid md:grid-cols-[1.08fr_.92fr]">
                <div className="relative min-h-[370px] overflow-hidden md:min-h-[520px]">
                  {featuredArtisan.profileImage ? <img src={featuredArtisan.profileImage} alt={featuredArtisan.name} className="absolute inset-0 h-full w-full object-cover" /> : <div className="irth-pattern absolute inset-0 opacity-35" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-petrol-deep)]/55 via-transparent to-transparent" />
                </div>
                <div className="flex items-center p-7 md:p-10 lg:p-14">
                  <div>
                    <p className="section-eyebrow !text-[var(--color-antique-gold)]">{t("قصة حرفي", "Artisan story")}</p>
                    <h2 className="mt-4 font-[var(--font-display)] text-4xl font-semibold leading-tight text-[#fff7e7] md:text-6xl">{featuredArtisan.name}</h2>
                    <p className="mt-2 text-sm text-white/58">{featuredArtisan.mainCraft} · {featuredArtisan.region || featuredArtisan.country}</p>
                    <p className="mt-6 text-sm leading-8 text-white/74 md:text-base">{featuredArtisan.story || featuredArtisan.bio}</p>
                    <Link href={`/artisan/${featuredArtisan.slug}`} className="btn-light mt-8">{t("اكتشف قصته", "Meet the artisan")} <span>→</span></Link>
                  </div>
                </div>
              </div>

              {artisans.length > 1 && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {artisans.slice(1).map((artisan) => (
                    <Link key={artisan.id} href={`/artisan/${artisan.slug}`} className="flex items-center gap-4 rounded-[var(--radius-md)] border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                      {artisan.profileImage ? <img src={artisan.profileImage} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/10 font-[var(--font-display)] text-xl">{artisan.name.charAt(0)}</span>}
                      <div className="min-w-0"><p className="font-[var(--font-display)] text-2xl font-semibold text-[#fff7e7]">{artisan.name}</p><p className="mt-1 truncate text-xs text-white/55">{artisan.mainCraft} · {artisan.country}</p></div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        );

      case "promotions":
        if (offers.length === 0) return null;
        return (
          <section className="irth-section">
            <div className="irth-section-heading">
              <div><p className="section-eyebrow">{t("عروض حالية", "Current offers")}</p><h2>{t("فرصة مختارة، بسعر موثوق.", "A special reason to look closer.")}</h2></div>
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {offers.map((offer, index) => (
                <Link
                  key={`${offer.promotion_id}-${offer.product_id}`}
                  href={`/product/${offer.product_slug}`}
                  className={`group relative overflow-hidden border p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)] ${index === 0 ? "min-h-[280px] rounded-[var(--radius-xl)] border-[var(--color-copper)]/35 bg-[var(--color-copper)] text-white lg:row-span-2 lg:min-h-full" : "rounded-[var(--radius-md)] border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-primary)]"}`}
                >
                  <div className={`irth-pattern absolute inset-0 ${index === 0 ? "opacity-20" : "opacity-10"}`} />
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <span className={`text-[10px] font-bold uppercase tracking-[.15em] ${index === 0 ? "text-[#fff0d7]" : "text-[var(--color-copper)]"}`}>{offer.source_type === "irth" ? "IRTH Offer" : "Artisan Offer"}</span>
                      <span className={`font-[var(--font-display)] text-3xl font-bold ${index === 0 ? "text-[#fff7e7]" : "text-[var(--color-copper)]"}`}>{offer.discount_type === "percentage" ? `${Number(offer.discount_value)}%` : formatMoney(offer.promotion_discount, offer.currency_code)}</span>
                    </div>
                    <div className="mt-12">
                      <h3 className={`font-[var(--font-display)] font-semibold leading-tight ${index === 0 ? "text-4xl md:text-5xl" : "text-2xl text-[var(--color-espresso)]"}`}>{offer.product_name_ar || offer.product_name_en}</h3>
                      <p className={`mt-2 text-sm ${index === 0 ? "text-white/72" : "text-[var(--text-secondary)]"}`}>{offer.artisan_name_ar || offer.artisan_name_en} · {offer.country_name_ar || offer.country_name_en}</p>
                      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm"><span className={index === 0 ? "text-white/55 line-through" : "text-[var(--text-muted)] line-through"}>{formatMoney(offer.original_line_total, offer.currency_code)}</span><span className="font-bold">{formatMoney(offer.final_line_total, offer.currency_code)}</span></div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );

      case "recently_viewed":
        if (recentlyViewed.length === 0) return null;
        return (
          <section className="irth-section">
            <div className="irth-section-heading"><div><p className="section-eyebrow">{t("شوهد مؤخرًا", "Recently viewed")}</p><h2>{t("كمّل من حيث توقفت.", "Pick up where you left off.")}</h2></div><Link href="/recently-viewed" className="irth-section-link">{t("عرض الكل", "View all")} <span>→</span></Link></div>
            <div className="irth-horizontal-rail mt-7 lg:grid-auto-columns-[minmax(220px,24%)]">{recentlyViewed.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
          </section>
        );

      case "story_brand":
        return (
          <section className="overflow-hidden border-y border-[var(--border-soft)] bg-[var(--surface-muted)]">
            <div className="mx-auto grid max-w-[var(--container-max)] md:grid-cols-2">
              <div className="relative min-h-[320px] bg-[var(--color-petrol)] md:min-h-[480px]">
                {countries[0]?.heroImage ? <img src={countries[0].heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="irth-pattern absolute inset-0 opacity-35" />}
                <div className="absolute inset-0 bg-[var(--color-petrol-deep)]/25" />
              </div>
              <div className="flex items-center px-6 py-14 md:px-12 lg:px-16">
                <div><p className="section-eyebrow">{t("قصتنا", "Our story")}</p><h2 className="mt-4 font-[var(--font-display)] text-4xl font-semibold leading-tight text-[var(--color-espresso)] md:text-6xl">{t("أكثر من مجرد قطعة.", "More than an object.")}</h2><p className="mt-6 max-w-xl text-base leading-8 text-[var(--text-secondary)]">{t("وراء كل قطعة يدٌ صنعتها، ومادة اختيرت، ومكان ترك أثره، ومعرفة انتقلت عبر الزمن.", "Explore the people, materials, places, and traditions behind handmade work.")}</p><Link href="/stories" className="btn-secondary mt-8">{t("اكتشف القصص", "Discover the stories")} <span>→</span></Link></div>
              </div>
            </div>
          </section>
        );

      case "wholesale_cta":
        return (
          <section className="irth-section">
            <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-petrol)] px-6 py-12 text-[var(--color-ivory)] md:px-10 md:py-16">
              <div className="irth-pattern absolute inset-0 opacity-20" />
              <div className="relative z-10 max-w-3xl"><p className="section-eyebrow !text-[var(--color-antique-gold)]">Wholesale · طلب كمية</p><h2 className="mt-3 font-[var(--font-display)] text-4xl font-semibold leading-tight text-[#fff7e7] md:text-6xl">{t("احتياجات أكبر، بنفس العناية.", "Source authentic crafts at scale.")}</h2><p className="mt-5 max-w-2xl text-sm leading-8 text-white/70 md:text-base">{t("أرسل طلب الكمية إلى IRTH. بيانات التواصل الخاصة بك تظل لدى IRTH ولا تُشارك مباشرة مع الحرفيين.", "Send a wholesale request to IRTH. Your contact information is handled by IRTH and is not shared directly with artisans.")}</p><Link href="/wholesale" className="btn-primary mt-8">{t("أرسل طلب كمية", "Wholesale request")} <span>→</span></Link></div>
            </div>
          </section>
        );

      case "trust_value":
        return (
          <section className="border-y border-[var(--border-soft)] bg-[var(--surface)]">
            <div className="irth-section py-10 md:py-12">
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                {[
                  { icon: "shield" as const, title: t("منتجات مراجَعة", "Reviewed products"), body: t("النشر يمر بمراجعة IRTH.", "Marketplace publishing follows IRTH review.") },
                  { icon: "user" as const, title: t("خصوصية العميل", "Customer privacy"), body: t("بيانات التواصل الحساسة لا تصل للحرفي.", "Sensitive contact details stay protected.") },
                  { icon: "return" as const, title: t("إرجاع واسترداد", "Returns & refunds"), body: t("جزء من تجربة الـMVP المعتمدة.", "Supported in the approved marketplace flow.") },
                  { icon: "orders" as const, title: t("طلب واحد واضح", "One clear order"), body: t("مع تقسيم داخلي حسب الحرفيين والشحنات.", "Internally organized by artisans and shipments.") },
                ].map((item) => (
                  <div key={item.title} className="text-center md:text-start"><IrthIcon name={item.icon} className="mx-auto h-7 w-7 text-[var(--color-copper)] md:mx-0" /><p className="mt-3 text-sm font-bold text-[var(--color-espresso)]">{item.title}</p><p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{item.body}</p></div>
                ))}
              </div>
            </div>
          </section>
        );

      case "blog_highlights": return <BlogHighlightsSection />;
      case "footer": return null;
      default: return null;
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[var(--background)]"><Header /><div className="flex h-96 items-center justify-center"><p className="text-[var(--text-secondary)]">جاري تحميل IRTH...</p></div></main>;
  }

  const visibleSections = homepageSections.filter((section) => section.visible).sort((a, b) => a.order - b.order);
  const heroVisible = visibleSections.some((section) => section.key === "hero");

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)] md:pb-0">
      <Header />
      {!heroVisible && <SearchExperience />}
      {visibleSections.map((section) => (
        <Fragment key={section.key}>
          {renderHomepageSection(section.key)}
          {section.key === "hero" && <SearchExperience />}
        </Fragment>
      ))}

      <nav className="bottom-nav md:hidden">
        <Link href="/" className="active"><IrthIcon name="home" />Home</Link>
        <Link href="/search"><IrthIcon name="search" />Search</Link>
        <Link href="/explore"><IrthIcon name="compass" />Explore</Link>
        <Link href="/saved"><IrthIcon name="heart" />Saved</Link>
        <Link href="/account"><IrthIcon name="user" />Account</Link>
      </nav>
    </main>
  );
}

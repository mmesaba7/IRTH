"use client";

import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Header from "./components/Header";
import BestSellersSection from "./components/BestSellersSection";
import NewArrivalsSection from "./components/NewArrivalsSection";
import ProductCard from "./components/ProductCard";
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
  market: {
    currency_code: string;
  };
  items: Array<{
    slug: string;
    status: string;
    originalLineTotal: string | null;
    lineTotal: string | null;
    promotionDiscount: string | null;
    promotion: null | {
      id: string;
    };
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
  { key: "blog_highlights", visible: true, order: 12 },
  { key: "trust_value", visible: true, order: 13 },
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

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [countries, setCountries] = useState<HomeCountry[]>([]);
  const [crafts, setCrafts] = useState<HomeCraft[]>([]);
  const [artisans, setArtisans] = useState<HomeArtisan[]>([]);
  const [offers, setOffers] = useState<HomeOffer[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSectionConfig[]>(
    DEFAULT_HOMEPAGE_SECTIONS
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHomepage() {
      setLoading(true);
      setError("");

      let selectedMarketId: string | null = null;

      try {
        const marketResponse = await fetch("/api/market-selection", {
          cache: "no-store",
        });

        if (marketResponse.ok) {
          const marketPayload = (await marketResponse.json()) as {
            market?: { id?: unknown } | null;
          };

          selectedMarketId =
            typeof marketPayload.market?.id === "string"
              ? marketPayload.market.id
              : null;
        }
      } catch {
        selectedMarketId = null;
      }

      const offersPromise = selectedMarketId
        ? supabase.rpc("get_active_promotions", {
            p_market_id: selectedMarketId,
          })
        : Promise.resolve({ data: [], error: null });

      const cmsPromise = fetch("/api/cms/homepage", {
        cache: "no-store",
      })
        .then(async (response) => {
          if (!response.ok) {
            return { data: null, error: new Error(`CMS request failed: ${response.status}`) };
          }
          const payload = (await response.json()) as { document?: unknown };
          return { data: payload.document ?? null, error: null };
        })
        .catch((error: unknown) => ({ data: null, error }));

      const [
        countriesResult,
        craftsResult,
        artisansResult,
        productsResult,
        offersResult,
        cmsResult,
      ] = await Promise.all([
        supabase
          .from("countries")
          .select("id, slug, name_ar, name_en")
          .eq("is_active", true)
          .order("name_en", { ascending: true }),
        supabase
          .from("crafts")
          .select("id, name_ar, name_en")
          .eq("is_active", true)
          .order("name_en", { ascending: true }),
        supabase
          .from("artisan_profiles")
          .select(
            "id, slug, name_ar, name_en, country_id, region_ar, region_en, bio_ar, bio_en, story_ar, story_en, primary_craft_id, profile_image_url"
          )
          .eq("status", "active")
          .order("slug", { ascending: true }),
        supabase
          .from("products")
          .select(
            "slug, artisan_id, primary_craft_id, name_ar, name_en, description_ar, description_en, story_ar, story_en, material_ar, material_en, price, dimensions, weight, made_to_order, preparation_time, one_of_a_kind, customization"
          )
          .eq("lifecycle_status", "published")
          .order("created_at", { ascending: false }),
        offersPromise,
        cmsPromise,
      ]);

      if (cancelled) return;

      if (
        countriesResult.error ||
        craftsResult.error ||
        artisansResult.error ||
        productsResult.error
      ) {
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

      if (offersResult.error) {
        console.error("Could not load active promotions:", offersResult.error);
      }

      if (cmsResult.error) {
        console.error("Could not load published homepage CMS; using safe defaults:", cmsResult.error);
      } else {
        const publishedSections = parsePublishedHomepageSections(cmsResult.data);
        if (publishedSections) {
          setHomepageSections(publishedSections);
        } else {
          console.error("Published homepage CMS payload is invalid; using safe defaults.");
        }
      }

      const countryRows = (countriesResult.data ?? []) as DbCountry[];
      const craftRows = (craftsResult.data ?? []) as DbCraft[];
      const artisanRows = (artisansResult.data ?? []) as DbArtisan[];
      const productRows = (productsResult.data ?? []) as DbProduct[];
      const rawOffers = offersResult.error
        ? []
        : ((offersResult.data ?? []) as HomeOfferRow[]);

      let winningOffers: HomeOffer[] = [];

      if (rawOffers.length > 0) {
        const offerSlugs = [...new Set(rawOffers.map((offer) => offer.product_slug))];

        try {
          const quoteResponse = await fetch("/api/cart/quote", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              items: offerSlugs.map((slug) => ({ slug, quantity: 1 })),
            }),
          });

          if (quoteResponse.ok) {
            const quotePayload = (await quoteResponse.json()) as {
              quote?: SecureOfferQuote;
            };
            const secureQuote = quotePayload.quote;

            if (secureQuote) {
              const rawOfferByWinnerKey = new Map(
                rawOffers.map((offer) => [
                  `${offer.promotion_id}:${offer.product_slug}`,
                  offer,
                ])
              );

              winningOffers = secureQuote.items.flatMap((item) => {
                if (
                  item.status !== "available" ||
                  !item.promotion ||
                  !item.originalLineTotal ||
                  !item.lineTotal ||
                  !item.promotionDiscount
                ) {
                  return [];
                }

                const rawOffer = rawOfferByWinnerKey.get(
                  `${item.promotion.id}:${item.slug}`
                );

                if (!rawOffer) return [];

                return [
                  {
                    ...rawOffer,
                    currency_code: secureQuote.market.currency_code,
                    original_line_total: item.originalLineTotal,
                    promotion_discount: item.promotionDiscount,
                    final_line_total: item.lineTotal,
                  },
                ];
              });
            }
          } else {
            console.error(
              "Could not resolve winning homepage promotions:",
              quoteResponse.status
            );
          }
        } catch (quoteError) {
          console.error("Could not resolve winning homepage promotions:", quoteError);
        }
      }

      const countryMap = new Map(countryRows.map((country) => [country.id, country]));
      const craftMap = new Map(craftRows.map((craft) => [craft.id, craft]));
      const visibleArtisanRows = artisanRows.filter((artisan) =>
        countryMap.has(artisan.country_id)
      );
      const artisanMap = new Map(
        visibleArtisanRows.map((artisan) => [artisan.id, artisan])
      );

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

      const mappedArtisans: HomeArtisan[] = visibleArtisanRows.slice(0, 3).map(
        (artisan) => {
          const country = countryMap.get(artisan.country_id);
          const craft = craftMap.get(artisan.primary_craft_id);

          return {
            id: artisan.id,
            slug: artisan.slug,
            name: artisan.name_ar || artisan.name_en,
            country: country?.name_ar || country?.name_en || "",
            region:
              artisan.region_ar ||
              artisan.region_en ||
              country?.name_ar ||
              country?.name_en ||
              "",
            mainCraft: craft?.name_ar || craft?.name_en || "",
            bio: artisan.bio_ar || artisan.bio_en || "",
            story: artisan.story_ar || artisan.story_en || "",
            profileImage: artisan.profile_image_url,
          };
        }
      );

      const accents: Product["accent"][] = ["terracotta", "olive", "copper"];
      const visibleProductRows = productRows.filter(
        (product) =>
          artisanMap.has(product.artisan_id) && craftMap.has(product.primary_craft_id)
      );

      const mappedProducts: Product[] = visibleProductRows.map((product, index) => {
        const artisan = artisanMap.get(product.artisan_id);
        const country = artisan ? countryMap.get(artisan.country_id) : undefined;
        const craft = craftMap.get(product.primary_craft_id);
        const craftName = craft?.name_en || "Craft";

        return {
          slug: product.slug,
          artisanSlug: artisan?.slug || "artisan",
          name: product.name_ar || product.name_en,
          artisan: artisan?.name_ar || artisan?.name_en || "IRTH Artisan",
          country: country?.name_ar || country?.name_en || "",
          price: Number(product.price),
          category: craftName,
          accent: accents[index % accents.length],
          origin:
            artisan?.region_ar ||
            artisan?.region_en ||
            country?.name_ar ||
            country?.name_en ||
            "",
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

      const recentlyViewedSlugs = JSON.parse(
        localStorage.getItem("irth-recently-viewed") || "[]"
      ) as string[];
      const recentProducts = recentlyViewedSlugs
        .map((productSlug) =>
          mappedProducts.find((product) => product.slug === productSlug)
        )
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

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const selectedProducts = products.slice(0, 6);
  const featuredArtisan = artisans[0];

  function renderHomepageSection(key: string): ReactNode {
    switch (key) {
      case "hero":
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
                <h1 className="mt-5 max-w-3xl font-[var(--font-display)] text-5xl font-normal leading-[1.02] md:text-6xl lg:text-7xl">
                  Discover the hands
                  <br className="hidden sm:block" /> behind the heritage.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-ivory)]/70 md:text-lg">
                  Explore authentic handmade work, meet the artisans who preserve traditional knowledge, and discover the places and stories behind every piece.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/explore" className="btn-primary">
                    Discover IRTH <span aria-hidden="true">→</span>
                  </Link>
                  <Link href="/crafts" className="btn-secondary-inverse">
                    Shop crafts
                  </Link>
                </div>
              </div>

              <div className="relative mx-auto aspect-[4/5] w-full max-w-[420px]">
                <div className="absolute inset-0 rotate-3 rounded-[var(--radius-xl)] bg-[var(--color-copper)]/20" />
                <div className="absolute inset-5 -rotate-2 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ivory)]/15 bg-[var(--color-olive)]">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative h-48 w-36 rounded-[42%_42%_36%_36%] bg-[var(--color-ivory)]/85 shadow-[var(--shadow-elevated)]">
                      <div className="absolute left-1/2 top-[-18px] h-14 w-16 -translate-x-1/2 rounded-full bg-[var(--color-ivory)]/85" />
                    </div>
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 rounded-[var(--radius-md)] bg-[var(--color-espresso)]/85 p-4 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-copper)]">Made by hand</p>
                    <p className="mt-1 font-[var(--font-display)] text-xl text-[var(--color-ivory)]">
                      Objects shaped by place, memory, and craft.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );

      case "crafts":
        if (crafts.length === 0) return null;
        return (
          <section className="mx-auto w-full max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
            <div className="flex items-end justify-between gap-5">
              <div>
                <p className="section-eyebrow">Explore by craft</p>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">Begin with the craft.</h2>
              </div>
              <Link href="/crafts" className="text-sm font-medium text-[var(--color-copper)] hover:underline">All crafts →</Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {crafts.map((craft) => (
                <Link key={craft.id} href={`/crafts?category=${encodeURIComponent(craft.filterName)}`} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
                  <p className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">{craft.name}</p>
                  <p className="mt-2 text-xs text-[var(--color-copper)]">Explore →</p>
                </Link>
              ))}
            </div>
          </section>
        );

      case "explore_countries":
        if (countries.length === 0) return null;
        return (
          <section className="border-y border-[var(--border-soft)] bg-[var(--surface-muted)]">
            <div className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
              <div>
                <p className="section-eyebrow">Explore by place</p>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">Heritage shaped by place.</h2>
              </div>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {countries.map((country) => (
                  <Link key={country.id} href={`/country/${country.slug}`} className="relative min-h-[230px] overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-espresso)] p-6 text-[var(--color-ivory)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]">
                    {country.heroImage && <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url("${country.heroImage}")` }} />}
                    <div className="relative z-10 flex h-full flex-col justify-end">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-copper)]">Country</p>
                      <h3 className="mt-2 font-[var(--font-display)] text-3xl">{country.name}</h3>
                      <p className="mt-1 text-sm text-[var(--color-ivory)]/65">{country.nameEn}</p>
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
          <section className="border-t border-[var(--border-soft)]">
            <div className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
              <div className="flex items-end justify-between gap-5">
                <div>
                  <p className="section-eyebrow">From the marketplace</p>
                  <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">Stories you can take home.</h2>
                </div>
                <Link href="/crafts" className="text-sm font-medium text-[var(--color-copper)] hover:underline">View all →</Link>
              </div>
              <div className="mt-8 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {selectedProducts.map((product) => <ProductCard key={product.slug} product={product} />)}
              </div>
            </div>
          </section>
        );

      case "best_sellers":
        return <BestSellersSection />;

      case "new_arrivals":
        return <NewArrivalsSection />;

      case "featured_artisans":
        if (!featuredArtisan && artisans.length <= 1) return null;
        return (
          <Fragment>
            {featuredArtisan && (
              <section className="overflow-hidden bg-[var(--color-olive)] text-[var(--color-ivory)]">
                <div className="mx-auto grid max-w-[var(--container-max)] md:grid-cols-2">
                  <div className="relative min-h-[340px] overflow-hidden">
                    {featuredArtisan.profileImage ? (
                      <img src={featuredArtisan.profileImage} alt={featuredArtisan.name} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-44 w-44 items-center justify-center rounded-full bg-[var(--color-ivory)]/90 p-6 text-center">
                          <span className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">{featuredArtisan.name}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center px-6 py-14 md:px-12">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-antique-gold)]">Meet the maker</p>
                      <h2 className="mt-4 font-[var(--font-display)] text-4xl md:text-5xl">{featuredArtisan.name}</h2>
                      <p className="mt-2 text-sm text-[var(--color-ivory)]/65">{featuredArtisan.mainCraft} · {featuredArtisan.country}</p>
                      <p className="mt-6 text-base leading-8 text-[var(--color-ivory)]/80">{featuredArtisan.bio}</p>
                      {featuredArtisan.story && <p className="mt-5 line-clamp-4 text-sm leading-7 text-[var(--color-ivory)]/65">{featuredArtisan.story}</p>}
                      <Link href={`/artisan/${featuredArtisan.slug}`} className="btn-light mt-8">Meet the artisan →</Link>
                    </div>
                  </div>
                </div>
              </section>
            )}
            {artisans.length > 1 && (
              <section className="mx-auto w-full max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
                <p className="section-eyebrow">Makers of IRTH</p>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">Meet more artisans.</h2>
                <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {artisans.map((artisan) => (
                    <Link key={artisan.id} href={`/artisan/${artisan.slug}`} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{artisan.country} · {artisan.region}</p>
                      <h3 className="mt-2 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">{artisan.name}</h3>
                      <p className="mt-1 text-sm font-medium text-[var(--color-copper)]">{artisan.mainCraft}</p>
                      {artisan.bio && <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">{artisan.bio}</p>}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </Fragment>
        );

      case "promotions":
        if (offers.length === 0) return null;
        return (
          <section className="mx-auto w-full max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
            <div className="flex items-end justify-between gap-5">
              <div>
                <p className="section-eyebrow">Current offers</p>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">عروض معتمدة وفعالة.</h2>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">يظهر هنا العرض الفائز فقط لكل منتج حسب السوق المختار.</p>
              </div>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer) => (
                <Link key={`${offer.promotion_id}-${offer.product_id}`} href={`/product/${offer.product_slug}`} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--color-espresso)]">{offer.source_type === "irth" ? "IRTH Offer" : "Artisan Offer"}</span>
                    <span className="text-lg font-semibold text-[var(--color-copper)]">{offer.discount_type === "percentage" ? `${Number(offer.discount_value)}% OFF` : `${formatMoney(offer.promotion_discount, offer.currency_code)} OFF`}</span>
                  </div>
                  <h3 className="mt-5 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">{offer.product_name_ar || offer.product_name_en}</h3>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{offer.artisan_name_ar || offer.artisan_name_en} · {offer.country_name_ar || offer.country_name_en}</p>
                  <p className="mt-3 text-sm text-[var(--text-muted)]">السعر الأصلي: {formatMoney(offer.original_line_total, offer.currency_code)}</p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-copper)]">بعد العرض: {formatMoney(offer.final_line_total, offer.currency_code)}</p>
                  <p className="mt-4 text-xs text-[var(--text-muted)]">حتى {new Date(offer.end_at).toLocaleString("ar-EG")}</p>
                </Link>
              ))}
            </div>
          </section>
        );

      case "recently_viewed":
        if (recentlyViewed.length === 0) return null;
        return (
          <section className="mx-auto w-full max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
            <p className="section-eyebrow">Continue exploring</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">Recently viewed.</h2>
            <div className="mt-8 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
              {recentlyViewed.map((product) => <ProductCard key={product.slug} product={product} />)}
            </div>
          </section>
        );

      case "story_brand":
        return (
          <section className="border-y border-[var(--border-soft)] bg-[var(--surface-muted)]">
            <div className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
              <p className="section-eyebrow">Heritage stories</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">More than an object.</h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">Explore the people, materials, places, and traditions behind handmade work.</p>
              <Link href="/stories" className="btn-secondary mt-7">Discover the stories →</Link>
            </div>
          </section>
        );

      case "wholesale_cta":
        return (
          <section className="mx-auto w-full max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
            <div className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-12 md:px-10">
              <p className="section-eyebrow">Wholesale · طلب كمية</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">Need a larger quantity?</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">Send a wholesale request to IRTH. Your contact information is handled by IRTH and is not shared directly with artisans.</p>
              <Link href="/wholesale" className="btn-secondary mt-7">Wholesale request →</Link>
            </div>
          </section>
        );

      case "trust_value":
        return (
          <section className="mx-auto w-full max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
            <div className="rounded-[var(--radius-xl)] bg-[var(--color-espresso)] px-6 py-12 text-center text-[var(--color-ivory)] md:py-16">
              <p className="section-eyebrow">Explore IRTH</p>
              <h2 className="mt-4 font-[var(--font-display)] text-4xl md:text-5xl">Begin anywhere.</h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-[var(--color-ivory)]/70">Start with a craft, a country, an artisan, or a story.</p>
              <Link href="/explore" className="btn-primary mt-7">Discover IRTH →</Link>
            </div>
          </section>
        );

      case "footer":
        return (
          <footer className="border-t border-[var(--color-ivory)]/10 bg-[var(--color-espresso)] text-[var(--color-ivory)]">
            <div className="mx-auto max-w-[var(--container-max)] px-5 py-12 md:px-6">
              <p className="font-[var(--font-display)] text-3xl tracking-[0.08em]">IRTH</p>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--color-ivory)]/60">A marketplace for authentic handmade crafts, the artisans who make them, and the heritage they carry.</p>
              <div className="mt-10 border-t border-[var(--color-ivory)]/10 pt-6 text-xs text-[var(--color-ivory)]/40">© 2026 IRTH. All rights reserved.</div>
            </div>
          </footer>
        );

      case "blog_highlights":
        return null;

      default:
        return null;
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري تحميل IRTH...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)] md:pb-0">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-5 pt-8 md:px-6 md:pt-10">
        <Link href="/search" className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow-soft)] transition-all hover:border-[var(--color-copper)] hover:shadow-[var(--shadow-card)]">
          <span className="text-xl text-[var(--color-copper)]">🔎</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--color-espresso)]">Search IRTH</p>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">Products, crafts, artisans, countries...</p>
          </div>
          <span className="text-[var(--color-copper)]">→</span>
        </Link>
        {error && <div className="mt-5 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}
      </section>

      {homepageSections
        .filter((section) => section.visible)
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <Fragment key={section.key}>{renderHomepageSection(section.key)}</Fragment>
        ))}

      <nav className="bottom-nav md:hidden">
        <Link href="/" className="active"><span>🏠</span> Home</Link>
        <Link href="/search"><span>🔎</span> Search</Link>
        <Link href="/explore"><span>🧭</span> Explore</Link>
        <Link href="/saved"><span>❤️</span> Saved</Link>
        <Link href="/account"><span>👤</span> Account</Link>
      </nav>
    </main>
  );
}

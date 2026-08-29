"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Header from "./components/Header";
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

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [countries, setCountries] = useState<HomeCountry[]>([]);
  const [crafts, setCrafts] = useState<HomeCraft[]>([]);
  const [artisans, setArtisans] = useState<HomeArtisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const resolveRecentlyViewed = (publicProducts: Product[]) => {
      const recentlyViewedSlugs = JSON.parse(
        localStorage.getItem("irth-recently-viewed") || "[]"
      ) as string[];

      const recentProducts = recentlyViewedSlugs
        .map((productSlug) =>
          publicProducts.find((product) => product.slug === productSlug)
        )
        .filter((product): product is Product => Boolean(product))
        .slice(0, 4);

      setRecentlyViewed(recentProducts);
    };

    const loadHomepage = async () => {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const [countriesResult, craftsResult, artisansResult, productsResult] =
        await Promise.all([
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

      const countryRows = (countriesResult.data ?? []) as DbCountry[];
      const craftRows = (craftsResult.data ?? []) as DbCraft[];
      const artisanRows = (artisansResult.data ?? []) as DbArtisan[];
      const productRows = (productsResult.data ?? []) as DbProduct[];

      const countryMap = new Map(countryRows.map((country) => [country.id, country]));
      const craftMap = new Map(craftRows.map((craft) => [craft.id, craft]));

      // A public homepage must not surface artisans belonging to an inactive country.
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

      setCountries(mappedCountries);
      setCrafts(mappedCrafts);
      setArtisans(mappedArtisans);
      setProducts(mappedProducts);
      resolveRecentlyViewed(mappedProducts);
      setLoading(false);
    };

    void loadHomepage();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "irth-recently-viewed") {
        resolveRecentlyViewed(products);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const selectedProducts = products.slice(0, 6);
  const featuredArtisan = artisans[0];

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
              Explore authentic handmade work, meet the artisans who preserve
              traditional knowledge, and discover the places and stories behind every piece.
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
              <div className="absolute inset-0 opacity-15">
                <div className="absolute left-8 top-10 h-24 w-24 rounded-full border border-[var(--color-ivory)]" />
                <div className="absolute bottom-10 right-8 h-20 w-20 rotate-45 border border-[var(--color-ivory)]" />
                <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-ivory)]" />
              </div>
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

      <section className="mx-auto max-w-[var(--container-max)] px-5 pt-8 md:px-6 md:pt-10">
        <Link
          href="/search"
          className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow-soft)] transition-all hover:border-[var(--color-copper)] hover:shadow-[var(--shadow-card)]"
        >
          <span className="text-xl text-[var(--color-copper)]">🔎</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--color-espresso)]">Search IRTH</p>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">Products, crafts, artisans, countries...</p>
          </div>
          <span className="text-[var(--color-copper)] transition-transform group-hover:translate-x-1">→</span>
        </Link>

        {error && (
          <div className="mt-5 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}
      </section>

      {crafts.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
          <div className="flex items-end justify-between gap-5">
            <div className="max-w-2xl">
              <p className="section-eyebrow">Explore by craft</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-normal text-[var(--color-espresso)] md:text-5xl">Begin with the craft.</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)] md:text-base">
                Discover handmade work through traditional techniques, materials, and generations of knowledge.
              </p>
            </div>
            <Link href="/crafts" className="hidden shrink-0 text-sm font-medium text-[var(--color-copper)] hover:underline sm:block">All crafts →</Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {crafts.map((craft, index) => {
              const backgrounds = [
                "bg-[var(--color-terracotta)]",
                "bg-[var(--color-olive)]",
                "bg-[var(--color-copper)]",
              ];

              return (
                <Link
                  key={craft.id}
                  href={`/crafts?category=${encodeURIComponent(craft.filterName)}`}
                  className="group overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
                >
                  <div className={`relative aspect-square ${backgrounds[index % backgrounds.length]}`}>
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute left-4 top-4 h-12 w-12 rounded-full border border-[var(--color-ivory)]" />
                      <div className="absolute bottom-5 right-5 h-9 w-9 rotate-45 border border-[var(--color-ivory)]" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-20 w-16 rounded-[40%] bg-[var(--color-ivory)]/75 transition-transform duration-300 group-hover:scale-105" />
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="font-[var(--font-display)] text-lg text-[var(--color-espresso)]">{craft.name}</p>
                    <p className="mt-1 text-xs text-[var(--color-copper)]">Explore →</p>
                  </div>
                </Link>
              );
            })}
          </div>

          <Link href="/crafts" className="mt-6 inline-block text-sm font-medium text-[var(--color-copper)] sm:hidden">View all crafts →</Link>
        </section>
      )}

      {countries.length > 0 && (
        <section className="border-y border-[var(--border-soft)] bg-[var(--surface-muted)]">
          <div className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
            <div className="flex items-end justify-between gap-5">
              <div className="max-w-2xl">
                <p className="section-eyebrow">Explore by place</p>
                <h2 className="mt-3 font-[var(--font-display)] text-3xl font-normal text-[var(--color-espresso)] md:text-5xl">Heritage shaped by place.</h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)] md:text-base">
                  Discover countries through the crafts, artisans, materials, and stories rooted in them.
                </p>
              </div>
              <Link href="/countries" className="hidden shrink-0 text-sm font-medium text-[var(--color-copper)] hover:underline sm:block">All countries →</Link>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {countries.map((country) => (
                <Link
                  key={country.id}
                  href={`/country/${country.slug}`}
                  className="group relative min-h-[300px] overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-espresso)] text-[var(--color-ivory)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]"
                >
                  {country.heroImage ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]"
                      style={{ backgroundImage: `url("${country.heroImage}")` }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-espresso)] to-[var(--color-copper)]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-espresso)] via-[var(--color-espresso)]/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-copper)]">Country</p>
                    <h3 className="mt-2 font-[var(--font-display)] text-3xl">{country.name}</h3>
                    <p className="mt-1 text-sm text-[var(--color-ivory)]/65">{country.nameEn}</p>
                    <p className="mt-5 text-sm font-medium text-[var(--color-copper)]">Explore country →</p>
                  </div>
                </Link>
              ))}
            </div>

            <Link href="/countries" className="mt-6 inline-block text-sm font-medium text-[var(--color-copper)] sm:hidden">View all countries →</Link>
          </div>
        </section>
      )}

      {selectedProducts.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
          <div className="flex items-end justify-between gap-5">
            <div className="max-w-2xl">
              <p className="section-eyebrow">From the marketplace</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-normal text-[var(--color-espresso)] md:text-5xl">Stories you can take home.</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] md:text-base">Handmade pieces shaped by craft, place, and the individual maker.</p>
            </div>
            <Link href="/crafts" className="hidden shrink-0 text-sm font-medium text-[var(--color-copper)] hover:underline sm:block">View all →</Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {selectedProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </section>
      )}

      {featuredArtisan && (
        <section className="overflow-hidden bg-[var(--color-olive)] text-[var(--color-ivory)]">
          <div className="mx-auto grid max-w-[var(--container-max)] md:grid-cols-2">
            <div className="relative min-h-[360px] overflow-hidden md:min-h-[520px]">
              {featuredArtisan.profileImage ? (
                <img src={featuredArtisan.profileImage} alt={featuredArtisan.name} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-44 w-44 items-center justify-center rounded-full bg-[var(--color-ivory)]/90 p-6 text-center shadow-[var(--shadow-elevated)]">
                    <span className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">{featuredArtisan.name}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center px-6 py-14 md:px-12 lg:px-16">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-antique-gold)]">Meet the maker</p>
                <h2 className="mt-4 font-[var(--font-display)] text-4xl font-normal leading-tight md:text-5xl">{featuredArtisan.name}</h2>
                <p className="mt-2 text-sm text-[var(--color-ivory)]/65">{featuredArtisan.mainCraft} · {featuredArtisan.country}</p>
                {featuredArtisan.bio && <p className="mt-6 text-base leading-8 text-[var(--color-ivory)]/80">{featuredArtisan.bio}</p>}
                {featuredArtisan.story && <p className="mt-5 line-clamp-4 text-sm leading-7 text-[var(--color-ivory)]/65">{featuredArtisan.story}</p>}
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link href={`/artisan/${featuredArtisan.slug}`} className="btn-light">Meet the artisan →</Link>
                  <Link href="/artisans" className="inline-flex min-h-[46px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-ivory)]/30 px-5 text-sm font-semibold text-[var(--color-ivory)] transition-colors hover:border-[var(--color-antique-gold)] hover:text-[var(--color-antique-gold)]">All artisans</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {artisans.length > 1 && (
        <section className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="section-eyebrow">Makers of IRTH</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-normal text-[var(--color-espresso)] md:text-5xl">Meet more artisans.</h2>
            </div>
            <Link href="/artisans" className="hidden text-sm font-medium text-[var(--color-copper)] hover:underline sm:block">View all →</Link>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {artisans.map((artisan) => (
              <Link
                key={artisan.id}
                href={`/artisan/${artisan.slug}`}
                className="group rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{artisan.country} · {artisan.region}</p>
                <h3 className="mt-2 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">{artisan.name}</h3>
                <p className="mt-1 text-sm font-medium text-[var(--color-copper)]">{artisan.mainCraft}</p>
                {artisan.bio && <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">{artisan.bio}</p>}
                <div className="mt-5 flex justify-end border-t border-[var(--border-soft)] pt-4">
                  <span className="text-sm font-medium text-[var(--color-copper)] transition-transform group-hover:translate-x-1">View artisan →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="border-y border-[var(--border-soft)] bg-[var(--surface-muted)]">
        <div className="mx-auto grid max-w-[var(--container-max)] gap-10 px-5 py-14 md:grid-cols-[0.9fr_1.1fr] md:items-center md:px-6 md:py-20">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-terracotta)]">
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="max-w-xs px-8 text-center font-[var(--font-display)] text-3xl leading-tight text-[var(--color-espresso)]">Every object carries the trace of a person, a place, and a tradition.</p>
            </div>
          </div>
          <div className="max-w-xl">
            <p className="section-eyebrow">Heritage stories</p>
            <h2 className="mt-3 font-[var(--font-display)] text-4xl font-normal leading-tight text-[var(--color-espresso)] md:text-5xl">More than an object.</h2>
            <p className="mt-5 text-base leading-8 text-[var(--text-secondary)]">Explore the people, materials, places, and traditions behind handmade work. IRTH connects the object you see with the heritage that shaped it.</p>
            <Link href="/stories" className="btn-secondary mt-7">Discover the stories →</Link>
          </div>
        </div>
      </section>

      {recentlyViewed.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="section-eyebrow">Continue exploring</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-normal text-[var(--color-espresso)] md:text-5xl">Recently viewed.</h2>
            </div>
            <Link href="/recently-viewed" className="hidden text-sm font-medium text-[var(--color-copper)] hover:underline sm:block">View history →</Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {recentlyViewed.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-espresso)] px-6 py-12 text-center text-[var(--color-ivory)] md:px-12 md:py-16">
          <div className="relative z-10 mx-auto max-w-2xl">
            <p className="section-eyebrow">Explore IRTH</p>
            <h2 className="mt-4 font-[var(--font-display)] text-4xl font-normal leading-tight md:text-5xl">Begin anywhere.</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--color-ivory)]/70">Start with a craft, a country, an artisan, or a story.</p>
            <Link href="/explore" className="btn-primary mt-7">Discover IRTH →</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--color-ivory)]/10 bg-[var(--color-espresso)] text-[var(--color-ivory)]">
        <div className="mx-auto max-w-[var(--container-max)] px-5 py-12 md:px-6 md:py-16">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr] md:gap-12">
            <div className="max-w-md">
              <p className="font-[var(--font-display)] text-3xl tracking-[0.08em]">IRTH</p>
              <p className="mt-4 text-sm leading-7 text-[var(--color-ivory)]/60">A marketplace for authentic handmade crafts, the artisans who make them, and the heritage they carry.</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-copper)]">Connect</p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--color-ivory)]/65">
                <span>Instagram</span><span>Facebook</span><span>TikTok</span><span>YouTube</span><span>LinkedIn</span><span>Email</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-copper)]">Help</p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--color-ivory)]/65">
                <span>Contact</span><span>Shipping</span><span>Returns &amp; Refunds</span><span>Privacy</span><span>Terms</span>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-[var(--color-ivory)]/10 pt-6">
            <div className="flex flex-col gap-3 text-xs text-[var(--color-ivory)]/40 sm:flex-row sm:items-center sm:justify-between">
              <p>IRTH · Heritage · Craft · Human</p>
              <p>© 2026 IRTH. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>

      <nav className="bottom-nav md:hidden">
        <Link href="/" className="active"><span>🏠</span>Home</Link>
        <Link href="/search"><span>🔎</span>Search</Link>
        <Link href="/explore"><span>🧭</span>Explore</Link>
        <Link href="/saved"><span>❤️</span>Saved</Link>
        <Link href="/account"><span>👤</span>Account</Link>
      </nav>
    </main>
  );
}

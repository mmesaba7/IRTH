"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import Header from "../../components/Header";
import ProductCard from "../../components/ProductCard";
import type { Product } from "../../data/products";
import { publicCountries } from "../../data/countries";
import { createClient } from "@/lib/supabase/client";

type CountryRow = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
};

type ArtisanRow = {
  id: string;
  slug: string;
  name_ar: string | null;
  name_en: string;
  country_id: string;
  region_ar: string | null;
  region_en: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  primary_craft_id: string;
  profile_image_url: string | null;
};

type ArtisanCraftRow = {
  craft_id: string;
};

type CraftRow = {
  id: string;
  name_ar: string;
  name_en: string;
};

type ProductRow = {
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

type CountryView = {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  heroImage?: string;
  culturalDescription?: string;
  culturalVideo?: string;
};

type CountryArtisanView = {
  slug: string;
  name: string;
  country: string;
  region: string;
  mainCraft: string;
  bio: string;
  profileImage: string | null;
};

type CountryCraftView = {
  label: string;
  value: string;
};

export default function CountryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [country, setCountry] = useState<CountryView | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [artisans, setArtisans] = useState<CountryArtisanView[]>([]);
  const [crafts, setCrafts] = useState<CountryCraftView[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadCountry = async () => {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const { data: countryData, error: countryError } = await supabase
        .from("countries")
        .select("id, slug, name_ar, name_en")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) return;

      if (countryError) {
        console.error("Could not load public country:", countryError);
        setError("تعذر تحميل بيانات الدولة.");
        setLoading(false);
        return;
      }

      if (!countryData) {
        router.replace("/404");
        return;
      }

      const countryRow = countryData as CountryRow;
      const editorialCountry = publicCountries[slug];

      const publicCountry: CountryView = {
        id: countryRow.id,
        slug: countryRow.slug,
        name: countryRow.name_ar || countryRow.name_en,
        nameEn: countryRow.name_en,
        heroImage: editorialCountry?.heroImage,
        culturalDescription: editorialCountry?.culturalDescription,
        culturalVideo: editorialCountry?.culturalVideo,
      };

      const { data: artisanData, error: artisanError } = await supabase
        .from("artisan_profiles")
        .select(
          "id, slug, name_ar, name_en, country_id, region_ar, region_en, bio_ar, bio_en, primary_craft_id, profile_image_url"
        )
        .eq("country_id", countryRow.id)
        .eq("status", "active")
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (artisanError) {
        console.error("Could not load country artisans:", artisanError);
        setError("تعذر تحميل حرفيي الدولة.");
        setLoading(false);
        return;
      }

      const artisanRows = (artisanData ?? []) as ArtisanRow[];
      const artisanIds = artisanRows.map((artisan) => artisan.id);

      let productRows: ProductRow[] = [];
      let artisanCraftRows: ArtisanCraftRow[] = [];

      if (artisanIds.length > 0) {
        const [productsResult, artisanCraftsResult] = await Promise.all([
          supabase
            .from("products")
            .select(
              "slug, artisan_id, primary_craft_id, name_ar, name_en, description_ar, description_en, story_ar, story_en, material_ar, material_en, price, dimensions, weight, made_to_order, preparation_time, one_of_a_kind, customization"
            )
            .in("artisan_id", artisanIds)
            .eq("lifecycle_status", "published")
            .order("created_at", { ascending: false }),
          supabase
            .from("artisan_crafts")
            .select("craft_id")
            .in("artisan_id", artisanIds),
        ]);

        if (cancelled) return;

        if (productsResult.error || artisanCraftsResult.error) {
          console.error("Could not load country public relations:", {
            products: productsResult.error,
            artisanCrafts: artisanCraftsResult.error,
          });
          setError("تعذر تحميل محتوى الدولة بالكامل.");
          setLoading(false);
          return;
        }

        productRows = (productsResult.data ?? []) as ProductRow[];
        artisanCraftRows = (artisanCraftsResult.data ?? []) as ArtisanCraftRow[];
      }

      const craftIds = [
        ...new Set([
          ...artisanRows.map((artisan) => artisan.primary_craft_id),
          ...artisanCraftRows.map((row) => row.craft_id),
          ...productRows.map((product) => product.primary_craft_id),
        ]),
      ].filter(Boolean);

      let craftRows: CraftRow[] = [];

      if (craftIds.length > 0) {
        const { data: craftData, error: craftError } = await supabase
          .from("crafts")
          .select("id, name_ar, name_en")
          .in("id", craftIds)
          .eq("is_active", true);

        if (cancelled) return;

        if (craftError) {
          console.error("Could not load country crafts:", craftError);
          setError("تعذر تحميل حرف الدولة.");
          setLoading(false);
          return;
        }

        craftRows = (craftData ?? []) as CraftRow[];
      }

      const artisanMap = new Map(artisanRows.map((artisan) => [artisan.id, artisan]));
      const craftMap = new Map(craftRows.map((craft) => [craft.id, craft]));
      const accents: Product["accent"][] = ["terracotta", "olive", "copper"];

      const mappedArtisans: CountryArtisanView[] = artisanRows.map((artisan) => {
        const primaryCraft = craftMap.get(artisan.primary_craft_id);

        return {
          slug: artisan.slug,
          name: artisan.name_ar || artisan.name_en,
          country: publicCountry.name,
          region: artisan.region_ar || artisan.region_en || publicCountry.name,
          mainCraft: primaryCraft?.name_ar || primaryCraft?.name_en || "",
          bio: artisan.bio_ar || artisan.bio_en || "",
          profileImage: artisan.profile_image_url,
        };
      });

      const mappedProducts: Product[] = productRows.map((product, index) => {
        const artisan = artisanMap.get(product.artisan_id);
        const craft = craftMap.get(product.primary_craft_id);
        const craftName = craft?.name_ar || craft?.name_en || "Craft";

        return {
          slug: product.slug,
          artisanSlug: artisan?.slug || "artisan",
          name: product.name_ar || product.name_en,
          artisan: artisan?.name_ar || artisan?.name_en || "IRTH Artisan",
          country: publicCountry.name,
          price: Number(product.price),
          category: craftName,
          accent: accents[index % accents.length],
          origin:
            artisan?.region_ar ||
            artisan?.region_en ||
            publicCountry.name,
          artisanRole: `${craftName} artisan`,
          objectLabel: craftName || "Handmade product",
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

      const craftViews: CountryCraftView[] = craftRows
        .map((craft) => ({
          label: craft.name_ar || craft.name_en,
          value: craft.name_en,
        }))
        .filter((craft) => Boolean(craft.value))
        .sort((a, b) => a.label.localeCompare(b.label, "ar"));

      setCountry(publicCountry);
      setArtisans(mappedArtisans);
      setProducts(mappedProducts);
      setCrafts(craftViews);
      setLoading(false);
    };

    void loadCountry();

    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري تحميل الدولة...</p>
        </div>
      </main>
    );
  }

  if (!country) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-xl text-[var(--text-secondary)]">
            {error || "الدولة غير موجودة"}
          </p>
          <Link href="/" className="text-[var(--color-copper)] hover:underline">
            العودة للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  const countryFilter = encodeURIComponent(country.nameEn);

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      <section className="relative overflow-hidden bg-[var(--color-espresso)] text-[var(--color-ivory)]">
        {country.heroImage ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url("${country.heroImage}")` }}
          />
        ) : (
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-espresso)] to-[var(--color-copper)]" />
            <div className="absolute right-10 top-10 h-32 w-32 rounded-full border border-[var(--color-copper)]/20" />
            <div className="absolute bottom-10 left-10 h-24 w-24 rotate-45 border border-[var(--color-copper)]/20" />
          </div>
        )}

        <div className="absolute inset-0 bg-[var(--color-espresso)]/35" />

        <div className="relative z-10 mx-auto max-w-[var(--container-max)] px-5 py-16 md:px-6 md:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-copper)]">
              Explore
            </p>
            <h1 className="mt-4 font-[var(--font-display)] text-5xl leading-[1.05] md:text-7xl">
              {country.name}
            </h1>
            <p className="mt-2 text-lg text-[var(--color-ivory)]/60">
              {country.nameEn}
            </p>

            {country.culturalDescription && (
              <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-ivory)]/80 md:text-lg">
                {country.culturalDescription}
              </p>
            )}

            {country.culturalVideo && (
              <div className="mt-7">
                <a
                  href={country.culturalVideo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ivory)]/20 px-5 py-2.5 text-sm font-medium text-[var(--color-ivory)] transition-colors hover:border-[var(--color-copper)] hover:text-[var(--color-copper)]"
                >
                  <span>▶</span>
                  Watch introduction video
                </a>
              </div>
            )}

            <div className="mt-10 flex flex-wrap gap-8 border-t border-[var(--color-ivory)]/10 pt-7">
              <div>
                <p className="text-2xl font-semibold text-[var(--color-copper)]">{products.length}</p>
                <p className="mt-1 text-sm text-[var(--color-ivory)]/60">منتجات حرفية</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-[var(--color-copper)]">{artisans.length}</p>
                <p className="mt-1 text-sm text-[var(--color-ivory)]/60">حرفي وحرفية</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-[var(--color-copper)]">{crafts.length}</p>
                <p className="mt-1 text-sm text-[var(--color-ivory)]/60">حرفة رئيسية</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {crafts.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Crafts</p>
              <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">
                حرف {country.name}
              </h2>
            </div>
            <Link
              href={`/crafts?country=${countryFilter}`}
              className="shrink-0 text-sm font-medium text-[var(--color-copper)] hover:underline"
            >
              View all →
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {crafts.map((craft) => (
              <Link
                key={craft.value}
                href={`/crafts?category=${encodeURIComponent(craft.value)}&country=${countryFilter}`}
                className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--color-espresso)] transition-colors hover:border-[var(--color-copper)] hover:text-[var(--color-copper)]"
              >
                {craft.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {artisans.length > 0 && (
        <section className="border-t border-[var(--border-soft)] bg-[var(--surface)]">
          <div className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Artisans</p>
                <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">
                  حرفيو {country.name}
                </h2>
              </div>
              <Link href="/artisans" className="shrink-0 text-sm font-medium text-[var(--color-copper)] hover:underline">
                View all →
              </Link>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {artisans.slice(0, 6).map((artisan) => (
                <article
                  key={artisan.slug}
                  className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--background)] transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-olive)]">
                    {artisan.profileImage ? (
                      <img
                        src={artisan.profileImage}
                        alt={artisan.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute left-8 top-8 h-20 w-20 rounded-full border border-[var(--color-ivory)]/40" />
                          <div className="absolute bottom-10 right-10 h-14 w-14 rotate-45 border border-[var(--color-ivory)]/25" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[var(--color-ivory)]/90 px-4 text-center shadow-lg">
                            <span className="text-sm font-medium text-[var(--color-espresso)]">{artisan.name}</span>
                          </div>
                        </div>
                      </>
                    )}

                    {artisan.mainCraft && (
                      <div className="absolute bottom-4 left-4 rounded-full bg-[var(--surface)]/90 px-3 py-1.5 text-xs font-medium text-[var(--color-espresso)] backdrop-blur-sm">
                        {artisan.mainCraft}
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {artisan.country} · {artisan.region}
                    </p>
                    <h3 className="mt-2 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                      {artisan.name}
                    </h3>
                    {artisan.bio && (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">
                        {artisan.bio}
                      </p>
                    )}
                    <div className="mt-5 flex justify-end border-t border-[var(--border-soft)] pt-4">
                      <Link
                        href={`/artisan/${artisan.slug}`}
                        className="text-sm font-medium text-[var(--color-copper)] transition-colors hover:text-[var(--color-espresso)]"
                      >
                        View artisan →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Products</p>
              <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">
                منتجات من {country.name}
              </h2>
            </div>
            <Link
              href={`/crafts?country=${countryFilter}`}
              className="shrink-0 text-sm font-medium text-[var(--color-copper)] hover:underline"
            >
              View all →
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 6).map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </section>
      )}

      <nav className="bottom-nav md:hidden">
        <Link href="/">
          <span>🏠</span>
          Home
        </Link>
        <Link href="/search">
          <span>🔎</span>
          Search
        </Link>
        <Link href="/crafts" className="active">
          <span>🧭</span>
          Explore
        </Link>
        <Link href="/saved">
          <span>❤️</span>
          Saved
        </Link>
        <Link href="/account">
          <span>👤</span>
          Account
        </Link>
      </nav>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "../../components/Header";
import MobileBottomNav from "../../components/MobileBottomNav";
import ProductCard from "../../components/ProductCard";
import {
  loadPublicMarketplaceCatalog,
  type PublicCatalogArtisan,
  type PublicCatalogCountry,
  type PublicCatalogProduct,
} from "@/lib/publicMarketplace";

type CountryCmsPayload = {
  nameAr: string;
  nameEn: string;
  summaryAr: string;
  summaryEn: string;
  coverImageAssetId: string | null;
  culturalImageAssetIds: string[];
  introVideoAssetId: string | null;
};

type CountryCms = {
  payload: CountryCmsPayload;
  media: Record<string, string | null>;
  videoUrl: string | null;
};

export default function CountryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [country, setCountry] = useState<PublicCatalogCountry | null>(null);
  const [countryCms, setCountryCms] = useState<CountryCms | null>(null);
  const [artisans, setArtisans] = useState<PublicCatalogArtisan[]>([]);
  const [products, setProducts] = useState<PublicCatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [catalog, cmsResponse] = await Promise.all([
          loadPublicMarketplaceCatalog(),
          fetch(`/api/cms/countries/${encodeURIComponent(slug)}`, { cache: "no-store" }).catch(() => null),
        ]);
        if (cancelled) return;

        const publicCountry = catalog.countries.find((item) => item.slug === slug) ?? null;
        setCountry(publicCountry);

        if (cmsResponse?.ok) {
          const cmsBody = await cmsResponse.json();
          const document = cmsBody?.document;
          if (document?.payload && typeof document.payload === "object") {
            setCountryCms({
              payload: document.payload as CountryCmsPayload,
              media: cmsBody?.media && typeof cmsBody.media === "object" ? cmsBody.media : {},
              videoUrl: typeof cmsBody?.videoUrl === "string" ? cmsBody.videoUrl : null,
            });
          } else {
            setCountryCms(null);
          }
        } else {
          setCountryCms(null);
        }

        if (!publicCountry) {
          setArtisans([]);
          setProducts([]);
          return;
        }

        const countryArtisans = catalog.artisans.filter(
          (artisan) => artisan.countryEn === publicCountry.nameEn
        );
        const artisanSlugs = new Set(countryArtisans.map((artisan) => artisan.slug));

        setArtisans(countryArtisans);
        setProducts(
          catalog.products.filter((product) => artisanSlugs.has(product.artisanSlug))
        );
      } catch (loadError) {
        console.error("Could not load public country:", loadError);
        if (!cancelled) setError("تعذر تحميل بيانات الدولة حاليًا.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center text-[var(--text-secondary)]">جاري تحميل الدولة...</div>
      </main>
    );
  }

  if (!country) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-xl text-[var(--text-secondary)]">{error || "الدولة غير موجودة أو غير متاحة للعامة."}</p>
          <Link href="/countries" className="text-[var(--color-copper)] hover:underline">العودة للدول</Link>
        </div>
      </main>
    );
  }

  const displayNameAr = countryCms?.payload.nameAr || country.name;
  const displayNameEn = countryCms?.payload.nameEn || country.nameEn;
  const culturalDescription = countryCms?.payload.summaryAr || country.culturalDescription;
  const coverImage = countryCms?.payload.coverImageAssetId
    ? countryCms.media[countryCms.payload.coverImageAssetId] ?? country.heroImage
    : country.heroImage;
  const culturalImages = countryCms
    ? countryCms.payload.culturalImageAssetIds
        .map((id) => countryCms.media[id])
        .filter((url): url is string => Boolean(url))
    : [];
  const introVideoUrl = countryCms?.videoUrl ?? null;
  const countryFilter = encodeURIComponent(country.nameEn);

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      <section className="relative overflow-hidden bg-[var(--color-espresso)] text-[var(--color-ivory)]">
        {coverImage ? (
          <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url("${coverImage}")` }} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-espresso)] to-[var(--color-copper)] opacity-20" />
        )}
        <div className="absolute inset-0 bg-[var(--color-espresso)]/35" />

        <div className="relative z-10 mx-auto max-w-[var(--container-max)] px-5 py-16 md:px-6 md:py-24">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-copper)]">Explore</p>
          <h1 className="mt-4 font-[var(--font-display)] text-5xl md:text-7xl">{displayNameAr}</h1>
          <p className="mt-2 text-lg text-[var(--color-ivory)]/60">{displayNameEn}</p>

          {culturalDescription && (
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-ivory)]/80 md:text-lg">
              {culturalDescription}
            </p>
          )}

          {!introVideoUrl && country.culturalVideo && (
            <a
              href={country.culturalVideo}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex rounded-full border border-[var(--color-ivory)]/20 px-5 py-2.5 text-sm font-medium hover:border-[var(--color-copper)] hover:text-[var(--color-copper)]"
            >
              ▶ Watch introduction video
            </a>
          )}

          <div className="mt-10 flex flex-wrap gap-8 border-t border-[var(--color-ivory)]/10 pt-7">
            <div><p className="text-2xl font-semibold text-[var(--color-copper)]">{products.length}</p><p className="mt-1 text-sm text-[var(--color-ivory)]/60">منتجات حرفية</p></div>
            <div><p className="text-2xl font-semibold text-[var(--color-copper)]">{artisans.length}</p><p className="mt-1 text-sm text-[var(--color-ivory)]/60">حرفي وحرفية</p></div>
            <div><p className="text-2xl font-semibold text-[var(--color-copper)]">{country.craftOptions.length}</p><p className="mt-1 text-sm text-[var(--color-ivory)]/60">حرف نشطة</p></div>
          </div>
        </div>
      </section>

      {introVideoUrl && (
        <section className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
          <div className="max-w-3xl">
            <p className="section-eyebrow">Introduction film</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">اكتشف {displayNameAr}</h2>
            <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">فيديو تعريفي قصير عن البلد، ثقافتها، وحرفها.</p>
          </div>
          <video src={introVideoUrl} controls preload="metadata" playsInline className="mt-8 w-full max-w-5xl rounded-[var(--radius-xl)] bg-black shadow-[var(--shadow-card)]" />
        </section>
      )}

      {culturalImages.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
          <div className="max-w-3xl">
            <p className="section-eyebrow">Culture & place</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">ملامح من {displayNameAr}</h2>
            {countryCms?.payload.summaryEn && <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">{countryCms.payload.summaryEn}</p>}
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {culturalImages.map((url, index) => (
              <div key={`${url}-${index}`} className="overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface-muted)]">
                <img src={url} alt={`${displayNameEn} cultural image ${index + 1}`} className="aspect-[4/3] h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}

      {country.craftOptions.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="section-eyebrow">Crafts</p>
              <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">حرف {displayNameAr}</h2>
            </div>
            <Link href={`/crafts?country=${countryFilter}`} className="text-sm font-medium text-[var(--color-copper)] hover:underline">View all →</Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {country.craftOptions.map((craft) => (
              <Link
                key={craft.value}
                href={`/crafts?category=${encodeURIComponent(craft.value)}&country=${countryFilter}`}
                className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-3 text-sm text-[var(--color-espresso)] hover:border-[var(--color-copper)]"
              >
                {craft.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="border-y border-[var(--border-soft)] bg-[var(--surface-muted)]">
        <div className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="section-eyebrow">Artisans</p>
              <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">Makers of {displayNameEn}</h2>
            </div>
            <Link href="/artisans" className="text-sm font-medium text-[var(--color-copper)] hover:underline">All artisans →</Link>
          </div>

          {artisans.length === 0 ? (
            <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface)] p-10 text-center text-[var(--text-secondary)]">لا يوجد حرفيون متاحون للعامة حاليًا.</div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {artisans.map((artisan) => (
                <Link key={artisan.slug} href={`/artisan/${artisan.slug}`} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 hover:shadow-[var(--shadow-card)]">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{artisan.region}</p>
                  <h3 className="mt-2 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">{artisan.name}</h3>
                  <p className="mt-1 text-sm font-medium text-[var(--color-copper)]">{artisan.mainCraft}</p>
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">{artisan.bio}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="section-eyebrow">Marketplace</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">Pieces from {displayNameEn}</h2>
          </div>
          <Link href={`/crafts?country=${countryFilter}`} className="text-sm font-medium text-[var(--color-copper)] hover:underline">View all →</Link>
        </div>

        {products.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center text-[var(--text-secondary)]">لا توجد منتجات منشورة من هذه الدولة حاليًا.</div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        )}
      </section>

      <MobileBottomNav active="explore" />
    </main>
  );
}

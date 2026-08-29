"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "../../components/Header";
import ProductCard from "../../components/ProductCard";
import {
  loadPublicMarketplaceCatalog,
  type PublicCatalogArtisan,
  type PublicCatalogCountry,
  type PublicCatalogProduct,
} from "@/lib/publicMarketplace";

export default function CountryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [country, setCountry] = useState<PublicCatalogCountry | null>(null);
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
        const catalog = await loadPublicMarketplaceCatalog();
        if (cancelled) return;

        const publicCountry = catalog.countries.find((item) => item.slug === slug) ?? null;
        setCountry(publicCountry);

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

  const countryFilter = encodeURIComponent(country.nameEn);

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      <section className="relative overflow-hidden bg-[var(--color-espresso)] text-[var(--color-ivory)]">
        {country.heroImage ? (
          <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url("${country.heroImage}")` }} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-espresso)] to-[var(--color-copper)] opacity-20" />
        )}
        <div className="absolute inset-0 bg-[var(--color-espresso)]/35" />

        <div className="relative z-10 mx-auto max-w-[var(--container-max)] px-5 py-16 md:px-6 md:py-24">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-copper)]">Explore</p>
          <h1 className="mt-4 font-[var(--font-display)] text-5xl md:text-7xl">{country.name}</h1>
          <p className="mt-2 text-lg text-[var(--color-ivory)]/60">{country.nameEn}</p>

          {country.culturalDescription && (
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-ivory)]/80 md:text-lg">
              {country.culturalDescription}
            </p>
          )}

          {country.culturalVideo && (
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

      {country.craftOptions.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="section-eyebrow">Crafts</p>
              <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">حرف {country.name}</h2>
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
              <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">Makers of {country.name}</h2>
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
            <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">Pieces from {country.name}</h2>
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
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "../../components/Header";
import ProductCard from "../../components/ProductCard";
import {
  loadPublicMarketplaceCatalog,
  type PublicCatalogArtisan,
  type PublicCatalogProduct,
} from "@/lib/publicMarketplace";

export default function ArtisanProfilePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [artisan, setArtisan] = useState<PublicCatalogArtisan | null>(null);
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

        const publicArtisan = catalog.artisans.find((item) => item.slug === slug) ?? null;
        setArtisan(publicArtisan);
        setProducts(
          publicArtisan
            ? catalog.products.filter((product) => product.artisanSlug === publicArtisan.slug)
            : []
        );
      } catch (loadError) {
        console.error("Could not load public artisan:", loadError);
        if (!cancelled) setError("تعذر تحميل بيانات الحرفي حاليًا.");
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
        <div className="flex h-96 items-center justify-center text-[var(--text-secondary)]">
          جاري تحميل الحرفي...
        </div>
      </main>
    );
  }

  if (!artisan) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-xl text-[var(--text-secondary)]">
            {error || "الحرفي غير موجود أو غير متاح للعامة."}
          </p>
          <Link href="/artisans" className="text-[var(--color-copper)] hover:underline">
            العودة للحرفيين
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      <section className="relative overflow-hidden bg-[var(--color-espresso)] text-[var(--color-ivory)]">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-espresso)] to-[var(--color-copper)] opacity-10" />
        <div className="relative z-10 mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
          <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:gap-12">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-copper)]/30 md:h-40 md:w-40">
              {artisan.profileImage ? (
                <img src={artisan.profileImage} alt={artisan.name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-[var(--font-display)] text-5xl text-[var(--color-ivory)]/70">
                  {artisan.name.charAt(0)}
                </span>
              )}
            </div>

            <div className="max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-copper)]">Artisan</p>
              <h1 className="mt-2 font-[var(--font-display)] text-4xl md:text-6xl">{artisan.name}</h1>
              <p className="mt-3 text-sm text-[var(--color-ivory)]/70">
                {artisan.mainCraft} · {artisan.region || artisan.country}
              </p>

              {artisan.additionalCrafts.length > 0 && (
                <p className="mt-2 text-xs text-[var(--color-ivory)]/50">
                  حرف إضافية: {artisan.additionalCrafts.join(" · ")}
                </p>
              )}

              {artisan.bio && (
                <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--color-ivory)]/75">
                  {artisan.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {artisan.story && (
        <section className="mx-auto max-w-[var(--container-max)] border-b border-[var(--border-soft)] px-6 py-14 md:py-16">
          <div className="max-w-3xl">
            <p className="section-eyebrow">The Story</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-4xl">
              رحلة {artisan.name}
            </h2>
            <p className="mt-6 whitespace-pre-line leading-8 text-[var(--text-secondary)]">
              {artisan.story}
            </p>

            {artisan.video && (
              <a
                href={artisan.video}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex text-sm font-medium text-[var(--color-copper)] hover:underline"
              >
                ▶ مشاهدة الفيديو التعريفي
              </a>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-14 md:py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="section-eyebrow">Products</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-4xl">
              أعمال {artisan.name}
            </h2>
          </div>
          <span className="text-sm text-[var(--text-muted)]">{products.length} products</span>
        </div>

        {products.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center text-[var(--text-secondary)]">
            لا توجد منتجات منشورة لهذا الحرفي حاليًا.
          </div>
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

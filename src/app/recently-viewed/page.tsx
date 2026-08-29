"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import Link from "next/link";
import ProductCard from "../components/ProductCard";
import type { PublicCatalogProduct } from "@/lib/publicMarketplace";
import { loadPublicMarketplaceCatalog } from "@/lib/publicMarketplace";

export default function RecentlyViewedPage() {
  const [products, setProducts] = useState<PublicCatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const recentlyViewedSlugs = JSON.parse(
        localStorage.getItem("irth-recently-viewed") || "[]"
      ) as string[];

      if (recentlyViewedSlugs.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const catalog = await loadPublicMarketplaceCatalog();
        if (cancelled) return;

        const publicProductsBySlug = new Map(
          catalog.products.map((product) => [product.slug, product])
        );

        setProducts(
          recentlyViewedSlugs
            .map((slug) => publicProductsBySlug.get(slug))
            .filter((product): product is PublicCatalogProduct => Boolean(product))
            .slice(0, 20)
        );
      } catch (loadError) {
        console.error("Could not resolve recently viewed products:", loadError);
        if (!cancelled) setError("تعذر تحميل المنتجات التي شاهدتها مؤخرًا.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center text-[var(--text-secondary)]">
          جاري التحميل...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">History</p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">Recently Viewed</h1>
          </div>
          {products.length > 0 && (
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("irth-recently-viewed");
                setProducts([]);
              }}
              className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
            >
              Clear history
            </button>
          )}
        </div>

        {error && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
        )}

        {products.length === 0 ? (
          <div className="mt-16 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">No public products viewed yet</p>
            <Link href="/crafts" className="mt-5 inline-block text-sm font-medium text-[var(--color-copper)] hover:underline">Explore crafts →</Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

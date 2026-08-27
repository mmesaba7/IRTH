"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import Link from "next/link";
import {
  products as baseProducts,
  type Product,
} from "../data/products";
import ProductCard from "../components/ProductCard";



export default function RecentlyViewedPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ١- جلب slugs المنتجات التي شاهدها العميل
    const recentlyViewedSlugs: string[] = JSON.parse(
      localStorage.getItem("irth-recently-viewed") || "[]"
    );

    if (recentlyViewedSlugs.length === 0) {
      setLoading(false);
      return;
    }

    // ٢- جلب المنتجات (من localStorage + الملف الأساسي)
    const storedProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );
    const baseProductsList = Object.values(baseProducts);
    const allProducts = [...baseProductsList, ...storedProducts];

    // ٣- تصفية المنتجات حسب slugs (مع الحفاظ على الترتيب)
    const viewedProducts = recentlyViewedSlugs
      .map((slug) => allProducts.find((p) => p.slug === slug))
      .filter((p): p is Product => p !== undefined)
      .filter((p) => p.status === "approved" || !p.status); // المنتجات المعتمدة فقط

    setProducts(viewedProducts);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري التحميل...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] pb-24">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        {/* رأس الصفحة */}
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              History
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl md:text-5xl text-[var(--color-espresso)]">
              Recently Viewed
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Products you have explored recently
            </p>
          </div>

          {products.length > 0 && (
            <button
              onClick={() => {
                localStorage.removeItem("irth-recently-viewed");
                setProducts([]);
              }}
              className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
            >
              Clear history
            </button>
          )}
        </div>

        {/* عرض المنتجات */}
        {products.length === 0 ? (
          <div className="mt-16 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              🕊️ No products viewed yet
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Start exploring crafts and they will appear here
            </p>
            <Link
              href="/crafts"
              className="mt-5 inline-block text-sm font-medium text-[var(--color-copper)] hover:underline"
            >
              Explore crafts →
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
  <ProductCard key={product.slug} product={product} />
))}
    
          </div>
        )}
      </section>

      {/* Bottom Navigation (للجوال) */}
      <nav className="bottom-nav md:hidden">
        <Link href="/" className="active">
          <span>🏠</span> Home
        </Link>
        <Link href="/search">
          <span>🔎</span> Search
        </Link>
        <Link href="/crafts">
          <span>🧭</span> Explore
        </Link>
        <Link href="/saved">
          <span>❤️</span> Saved
        </Link>
        <Link href="/account">
          <span>👤</span> Account
        </Link>
      </nav>
    </main>
  );
}
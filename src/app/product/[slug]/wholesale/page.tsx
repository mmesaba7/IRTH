"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "../../../components/Header";
import MobileBottomNav from "../../../components/MobileBottomNav";
import WholesaleRequestForm from "../../../components/WholesaleRequestForm";
import { loadPublicMarketplaceCatalog, type PublicCatalogProduct } from "@/lib/publicMarketplace";

export default function ProductWholesalePage() {
  const params = useParams();
  const slug = String(params.slug ?? "");
  const [product, setProduct] = useState<PublicCatalogProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    loadPublicMarketplaceCatalog()
      .then((catalog) => {
        if (cancelled) return;
        setProduct(catalog.products.find((item) => item.slug === slug) ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("تعذر تحميل المنتج حاليًا.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      <section className="border-b border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="mx-auto max-w-4xl px-5 py-12 md:px-6 md:py-16">
          <Link href={`/product/${slug}`} className="text-sm text-[var(--color-copper)] hover:underline">
            ← Back to product
          </Link>
          <p className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
            Wholesale / Bulk Order
          </p>
          <h1 className="mt-3 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-6xl">
            طلب كمية من المنتج
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            IRTH تستقبل طلب الكمية وتراجع التفاصيل وتدير التنسيق داخل المنصة.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-10 md:px-6 md:py-14">
        {loading ? (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            <div className="h-20 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-muted)]" />
            <div className="h-72 animate-pulse rounded-[var(--radius-xl)] bg-[var(--surface-muted)]" />
          </div>
        ) : error ? (
          <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {error}
          </div>
        ) : !product ? (
          <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            المنتج غير متاح.
          </div>
        ) : (
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-8 md:p-10">
            <div className="mb-8 border-b border-[var(--border-soft)] pb-6">
              <p className="section-eyebrow">Selected product</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--color-espresso)]">{product.name}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                طلب الجملة مرتبط بهذا المنتج. IRTH ستراجع الطلب وتتولى التنسيق.
              </p>
            </div>

            <WholesaleRequestForm
              sourceType="product"
              productId={product.id}
              initialRequest={product.name}
            />
          </div>
        )}
      </section>

      <MobileBottomNav />
    </main>
  );
}

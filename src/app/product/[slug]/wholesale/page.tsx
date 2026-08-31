"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "../../../components/Header";
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
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-12 md:py-20">
        <Link href={`/product/${slug}`} className="text-sm text-[var(--color-copper)] hover:underline">← Back to product</Link>
        <p className="mt-8 text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Wholesale / Bulk Order</p>
        <h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">طلب كمية من المنتج</h1>
        {loading ? (
          <p className="mt-8 text-[var(--text-secondary)]">جاري تحميل المنتج...</p>
        ) : error ? (
          <div className="mt-8 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : !product ? (
          <div className="mt-8 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">المنتج غير متاح.</div>
        ) : (
          <div className="mt-8">
            <div className="mb-5 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
              طلب الجملة مرتبط بـ <strong>{product.name}</strong>. IRTH ستراجع الطلب وتتولى التنسيق.
            </div>
            <WholesaleRequestForm sourceType="product" productId={product.id} initialRequest={product.name} />
          </div>
        )}
      </section>
    </main>
  );
}

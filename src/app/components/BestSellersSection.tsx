"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { Product } from "../data/products";
import ProductCard from "./ProductCard";

export default function BestSellersSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadBestSellers() {
      try {
        const response = await fetch("/api/homepage/best-sellers", { cache: "no-store" });
        if (!response.ok) throw new Error(`Best sellers request failed: ${response.status}`);
        const payload = (await response.json()) as { products?: Product[] };
        if (!cancelled) setProducts(Array.isArray(payload.products) ? payload.products : []);
      } catch (error) {
        console.error("Could not load homepage best sellers:", error);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadBestSellers();
    return () => { cancelled = true; };
  }, []);

  if (loading || products.length === 0) return null;

  return (
    <section className="border-y border-[var(--border-soft)] bg-[var(--surface-muted)]/55">
      <div className="irth-section">
        <div className="irth-section-heading">
          <div>
            <p className="section-eyebrow">Best sellers</p>
            <h2>Pieces people keep choosing.</h2>
          </div>
          <Link href="/crafts" className="irth-section-link">View all <span aria-hidden="true">→</span></Link>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
          المنتجات الأعلى حسب إجمالي الكميات التي تم دفع ثمنها بنجاح.
        </p>

        <div className="irth-horizontal-rail mt-7 lg:grid-auto-columns-[minmax(220px,24%)]">
          {products.map((product) => <ProductCard key={product.slug} product={product} />)}
        </div>
      </div>
    </section>
  );
}

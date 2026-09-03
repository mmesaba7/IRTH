"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { Product } from "../data/products";
import ProductCard from "./ProductCard";

export default function NewArrivalsSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadNewArrivals() {
      try {
        const response = await fetch("/api/homepage/new-arrivals", { cache: "no-store" });
        if (!response.ok) throw new Error(`New arrivals request failed: ${response.status}`);
        const payload = (await response.json()) as { products?: Product[] };
        if (!cancelled) setProducts(Array.isArray(payload.products) ? payload.products : []);
      } catch (error) {
        console.error("Could not load homepage new arrivals:", error);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadNewArrivals();
    return () => { cancelled = true; };
  }, []);

  if (loading || products.length === 0) return null;

  const leadProducts = products.slice(0, 2);
  const railProducts = products.slice(2);

  return (
    <section className="bg-[var(--background)]">
      <div className="irth-section">
        <div className="irth-section-heading">
          <div>
            <p className="section-eyebrow">New arrivals</p>
            <h2>Fresh from the makers.</h2>
          </div>
          <Link href="/crafts" className="irth-section-link">View all <span aria-hidden="true">→</span></Link>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
          أحدث المنتجات التي اجتازت مراجعة IRTH وتم نشرها على المتجر.
        </p>

        <div className="mt-7 grid gap-4 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {leadProducts.map((product) => <ProductCard key={product.slug} product={product} />)}
          </div>

          {railProducts.length > 0 && (
            <div className="irth-horizontal-rail lg:grid-auto-columns-[minmax(190px,46%)]">
              {railProducts.map((product) => <ProductCard key={product.slug} product={product} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

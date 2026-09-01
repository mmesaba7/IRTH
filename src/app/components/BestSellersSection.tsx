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
        const response = await fetch("/api/homepage/best-sellers", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Best sellers request failed: ${response.status}`);
        }

        const payload = (await response.json()) as { products?: Product[] };
        if (!cancelled) {
          setProducts(Array.isArray(payload.products) ? payload.products : []);
        }
      } catch (error) {
        console.error("Could not load homepage best sellers:", error);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadBestSellers();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || products.length === 0) return null;

  return (
    <section className="border-t border-[var(--border-soft)]">
      <div className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="section-eyebrow">Best sellers</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">
              Most purchased on IRTH.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              المنتجات الأعلى حسب إجمالي الكميات التي تم دفع ثمنها بنجاح.
            </p>
          </div>
          <Link
            href="/crafts"
            className="text-sm font-medium text-[var(--color-copper)] hover:underline"
          >
            View all →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

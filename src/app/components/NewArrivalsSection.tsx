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
        const response = await fetch("/api/homepage/new-arrivals", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`New arrivals request failed: ${response.status}`);
        }

        const payload = (await response.json()) as { products?: Product[] };
        if (!cancelled) {
          setProducts(Array.isArray(payload.products) ? payload.products : []);
        }
      } catch (error) {
        console.error("Could not load homepage new arrivals:", error);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadNewArrivals();

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
            <p className="section-eyebrow">New arrivals</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">
              Newly published on IRTH.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              أحدث المنتجات التي اجتازت مراجعة IRTH وتم نشرها على المتجر.
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

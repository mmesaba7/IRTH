"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import IrthIcon from "../components/IrthIcon";
import ProductCard from "../components/ProductCard";
import type { PublicCatalogProduct } from "@/lib/publicMarketplace";
import { loadPublicMarketplaceCatalog } from "@/lib/publicMarketplace";
import {
  ensureSavedProductsLoaded,
  removeSavedProduct,
} from "@/lib/savedProductsClient";

export default function SavedPage() {
  const [savedSlugs, setSavedSlugs] = useState<string[]>([]);
  const [products, setProducts] = useState<PublicCatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const saved = await ensureSavedProductsLoaded();
        if (cancelled) return;
        setSavedSlugs(saved);

        if (saved.length === 0) {
          setProducts([]);
          return;
        }

        const catalog = await loadPublicMarketplaceCatalog();
        if (cancelled) return;

        const publicProductsBySlug = new Map(
          catalog.products.map((product) => [product.slug, product])
        );

        setProducts(
          saved
            .map((slug) => publicProductsBySlug.get(slug))
            .filter((product): product is PublicCatalogProduct => Boolean(product))
        );
      } catch (loadError) {
        console.error("Could not resolve saved products:", loadError);
        if (!cancelled) setError("تعذر تحميل المنتجات المحفوظة.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const removeSaved = (slug: string) => {
    removeSavedProduct(slug);
    setSavedSlugs((current) => current.filter((item) => item !== slug));
    setProducts((current) => current.filter((product) => product.slug !== slug));
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center text-[var(--text-secondary)]">جاري التحميل...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-12 md:py-20">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Your collection</p>
        <h1 className="mt-3 font-[var(--font-display)] text-5xl font-normal text-[var(--color-espresso)]">Saved crafts</h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          {savedSlugs.length > 0 ? "Saved products follow your account when you are signed in." : "Save products you want to return to later."}
        </p>

        {error && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
        )}

        {products.length === 0 ? (
          <div className="mt-12 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">You have no saved public products.</p>
            <Link href="/crafts" className="mt-5 inline-block text-sm font-medium text-[var(--color-copper)]">Discover crafts →</Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div key={product.slug}>
                <ProductCard product={product} />
                <button
                  type="button"
                  onClick={() => removeSaved(product.slug)}
                  className="mt-3 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-3 text-sm font-medium text-[var(--color-espresso)] hover:border-[var(--color-copper)] hover:text-[var(--color-copper)]"
                >
                  Remove from saved
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <nav className="bottom-nav md:hidden">
        <Link href="/"><IrthIcon name="home" />Home</Link>
        <Link href="/search"><IrthIcon name="search" />Search</Link>
        <Link href="/explore"><IrthIcon name="compass" />Explore</Link>
        <Link href="/saved" className="active"><IrthIcon name="heart" />Saved</Link>
        <Link href="/account"><IrthIcon name="user" />Account</Link>
      </nav>
    </main>
  );
}
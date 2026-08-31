"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { Product } from "../data/products";
import Link from "next/link";
import { useProductQuote } from "@/lib/useProductQuote";
import {
  ensureSavedProductsLoaded,
  getSavedSnapshot,
  getServerSavedSnapshot,
  parseSavedSnapshot,
  subscribeToSaved,
  toggleSavedProduct,
} from "@/lib/savedProductsClient";

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const { slug } = product;
  const savedSnapshot = useSyncExternalStore(
    subscribeToSaved,
    getSavedSnapshot,
    getServerSavedSnapshot
  );
  const savedProducts = useMemo(
    () => parseSavedSnapshot(savedSnapshot),
    [savedSnapshot]
  );
  const saved = savedProducts.includes(slug);
  const { quote, item, loading, marketRequired, error } = useProductQuote(slug, 1);
  const canAddToCart = item?.status === "available";

  useEffect(() => {
    void ensureSavedProductsLoaded();
  }, []);

  const toggleSaved = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSavedProduct(slug);
  };

  const accentColors = {
    terracotta: "bg-[var(--color-terracotta)]",
    olive: "bg-[var(--color-olive)]",
    copper: "bg-[var(--color-copper)]",
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canAddToCart) return;

    const cart = JSON.parse(localStorage.getItem("irth-cart") || "[]");
    const safeCart = Array.isArray(cart) ? cart : [];

    localStorage.setItem(
      "irth-cart",
      JSON.stringify([...safeCart, { slug: product.slug }])
    );
    window.dispatchEvent(new Event("irth-cart-updated"));
  };

  const priceLabel = loading
    ? "Checking price…"
    : marketRequired
      ? "Select market to see price"
      : error
        ? "Price unavailable"
        : item?.status === "available" && item.unitPrice && quote
          ? `${item.unitPrice} ${quote.market.currency_code}`
          : item?.status === "out_of_stock"
            ? "Out of stock"
            : item?.status === "insufficient_stock"
              ? "Insufficient stock"
              : item?.status === "not_priced_for_market"
                ? "Not priced for this market"
                : "Unavailable";

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="card hover:shadow-[var(--shadow-elevated)] transition-all duration-300">
        <div
          className={`relative aspect-[4/3] rounded-[var(--radius-md)] ${accentColors[product.accent]} overflow-hidden`}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-4 w-12 h-12 border border-[var(--color-ivory)]/30 rounded-full" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border border-[var(--color-ivory)]/20 rotate-45" />
            <div className="absolute inset-1/3 w-16 h-16 border border-[var(--color-ivory)]/10 rounded-full" />
          </div>

          <div className="absolute inset-4 rounded-[var(--radius-md)] border border-[var(--color-ivory)]/30" />
          <div className="absolute left-1/2 top-1/2 h-24 w-20 -translate-x-1/2 -translate-y-1/2 rounded-[45%] bg-[var(--color-ivory)]/80 shadow-lg transition-transform duration-500 group-hover:scale-105" />

          <button
            onClick={toggleSaved}
            aria-label={saved ? "Remove from saved" : "Save product"}
            className={`absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)]/90 text-lg backdrop-blur-sm transition-colors ${
              saved ? "text-[var(--color-copper)]" : "text-[var(--text-muted)] hover:text-[var(--color-espresso)]"
            }`}
          >
            {saved ? "♥" : "♡"}
          </button>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-espresso)] px-5 py-2 text-xs font-medium text-[var(--color-ivory)] opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-0"
          >
            Add to cart 🛒
          </button>
        </div>

        <div className="mt-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {product.country} · {product.category}
          </p>
          <h3 className="mt-1 font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
            {product.name}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">By {product.artisan}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{product.objectLabel}</p>
          <p className="mt-2 font-medium text-[var(--color-copper)]">{priceLabel}</p>
        </div>
      </div>
    </Link>
  );
}

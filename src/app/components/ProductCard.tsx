"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
import IrthIcon from "./IrthIcon";

type ProductCardProps = {
  product: Product;
};

type ProductMedia = {
  id: string;
  media_type: "image" | "video";
  signedUrl: string;
};

export default function ProductCard({ product }: ProductCardProps) {
  const { slug } = product;
  const savedSnapshot = useSyncExternalStore(
    subscribeToSaved,
    getSavedSnapshot,
    getServerSavedSnapshot
  );
  const savedProducts = useMemo(() => parseSavedSnapshot(savedSnapshot), [savedSnapshot]);
  const saved = savedProducts.includes(slug);
  const { quote, item, loading, marketRequired, error } = useProductQuote(slug, 1);
  const canAddToCart = item?.status === "available";
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    void ensureSavedProductsLoaded();
  }, []);

  useEffect(() => {
    if (!product.id) {
      setCoverUrl(null);
      return;
    }

    const controller = new AbortController();
    fetch(`/api/products/${product.id}/media`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload: { media?: ProductMedia[]; coverMediaId?: string | null } | null) => {
        if (!payload || controller.signal.aborted) return;
        const media = Array.isArray(payload.media) ? payload.media : [];
        const cover = media.find((entry) => entry.id === payload.coverMediaId && entry.media_type === "image")
          ?? media.find((entry) => entry.media_type === "image")
          ?? null;
        setCoverUrl(cover?.signedUrl ?? null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCoverUrl(null);
      });

    return () => controller.abort();
  }, [product.id]);

  const toggleSaved = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggleSavedProduct(slug);
  };

  const accentColors = {
    terracotta: "bg-[var(--color-terracotta)]",
    olive: "bg-[var(--color-olive)]",
    copper: "bg-[var(--color-copper)]",
  };

  const handleAddToCart = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!canAddToCart) return;

    const cart = JSON.parse(localStorage.getItem("irth-cart") || "[]");
    const safeCart = Array.isArray(cart) ? cart : [];

    localStorage.setItem("irth-cart", JSON.stringify([...safeCart, { slug: product.slug }]));
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
    <Link href={`/product/${product.slug}`} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] transition duration-300 hover:-translate-y-1 hover:border-[var(--border-medium)] hover:shadow-[var(--shadow-card)]">
        <div className={`relative aspect-[4/3] overflow-hidden ${accentColors[product.accent]}`}>
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(248,244,234,.08),rgba(6,44,56,.18))]">
              <div className="irth-pattern absolute inset-0 opacity-30" />
              <div className="absolute left-1/2 top-1/2 h-24 w-20 -translate-x-1/2 -translate-y-1/2 rounded-[42%_42%_35%_35%] bg-[var(--color-ivory)]/78 shadow-lg transition-transform duration-500 group-hover:scale-105" />
            </div>
          )}

          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent" />

          <button
            type="button"
            onClick={toggleSaved}
            aria-label={saved ? "Remove from saved" : "Save product"}
            className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-[var(--color-petrol-deep)]/74 text-white backdrop-blur-md transition ${saved ? "text-[var(--color-antique-gold)]" : "hover:bg-[var(--color-petrol-deep)]"}`}
          >
            <IrthIcon name="heart" className={`h-[18px] w-[18px] ${saved ? "fill-current" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            aria-label={canAddToCart ? `Add ${product.name} to cart` : priceLabel}
            className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-petrol-deep)] text-[var(--color-ivory)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-45 md:opacity-0 md:translate-y-1 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus:opacity-100"
          >
            <IrthIcon name="cart" className="h-[19px] w-[19px]" />
          </button>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {product.country}{product.country && product.category ? " · " : ""}{product.category}
          </p>
          <h3 className="mt-1.5 line-clamp-2 font-[var(--font-display)] text-[1.28rem] font-semibold leading-tight text-[var(--color-espresso)]">
            {product.name}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-[var(--text-secondary)]">{product.artisan}</p>
          <p className="mt-auto pt-3 text-sm font-bold text-[var(--color-copper)]">{priceLabel}</p>
        </div>
      </article>
    </Link>
  );
}

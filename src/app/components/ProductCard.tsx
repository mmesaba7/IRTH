"use client";

import { useEffect, useState } from "react";
import { products } from "../data/products";
import { getCustomProducts } from "../data/productStorage";

type ProductCardProps = {
  slug: string;
};

export default function ProductCard({ slug }: ProductCardProps) {
  const customProducts = getCustomProducts();

const product =
  products[slug] ||
  customProducts.find((item) => item.slug === slug);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedProducts = JSON.parse(
      localStorage.getItem("irth-saved-products") || "[]"
    );

    setSaved(savedProducts.includes(slug));
  }, [slug]);

  const toggleSaved = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const savedProducts = JSON.parse(
      localStorage.getItem("irth-saved-products") || "[]"
    );

    let updatedProducts: string[];

    if (savedProducts.includes(slug)) {
      updatedProducts = savedProducts.filter(
        (item: string) => item !== slug
      );

      setSaved(false);
    } else {
      updatedProducts = [...savedProducts, slug];

      setSaved(true);
    }

    localStorage.setItem(
      "irth-saved-products",
      JSON.stringify(updatedProducts)
    );

    window.dispatchEvent(new Event("irth-saved-updated"));
  };

  if (!product) {
    return null;
  }

  const accentStyles = {
    terracotta: {
      background: "bg-[var(--color-terracotta)]",
      label: "text-[var(--color-espresso)]",
    },
    olive: {
      background: "bg-[var(--color-olive)]",
      label: "text-[var(--color-ivory)]",
    },
    copper: {
      background: "bg-[var(--color-copper)]",
      label: "text-[var(--color-ivory)]",
    },
  };

  const colors = accentStyles[product.accent];

  return (
    <a
      href={`/product?slug=${product.slug}`}
      className="group block overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
    >
      <div
        className={`relative aspect-[4/3] ${colors.background} overflow-hidden`}
      >
        <div className="absolute inset-8 rounded-[var(--radius-xl)] border border-white/30" />

        <div className="absolute left-1/2 top-1/2 h-32 w-24 -translate-x-1/2 -translate-y-1/2 rotate-[-5deg] rounded-[42%_42%_35%_35%] bg-[var(--color-ivory)]/85 shadow-lg transition-transform duration-500 group-hover:scale-105 group-hover:rotate-0">
          <div className="absolute left-1/2 top-5 h-20 w-14 -translate-x-1/2 rounded-[45%] border border-[var(--color-bronze)]/40" />
        </div>

        <span
          className={`absolute left-5 top-5 text-xs font-medium uppercase tracking-[0.16em] ${colors.label}`}
        >
          {product.category}
        </span>

        <button
          type="button"
          aria-label={
            saved
              ? `Remove ${product.name} from saved`
              : `Save ${product.name}`
          }
          onClick={toggleSaved}
          className={`absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)]/90 text-lg backdrop-blur-sm transition-colors ${
            saved
              ? "text-[var(--color-copper)]"
              : "text-[var(--color-espresso)] hover:bg-[var(--color-espresso)] hover:text-[var(--color-ivory)]"
          }`}
        >
          {saved ? "♥" : "♡"}
        </button>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {product.country}
            </p>

            <h3 className="mt-2 font-[var(--font-display)] text-2xl leading-tight text-[var(--color-espresso)]">
              {product.name}
            </h3>
          </div>

          <p className="shrink-0 text-sm font-medium text-[var(--color-copper)]">
            ${product.price}
          </p>
        </div>

        <div className="mt-5 border-t border-[var(--border-soft)] pt-4">
          <p className="text-sm text-[var(--text-secondary)]">
            By{" "}
            <span className="text-[var(--color-espresso)]">
              {product.artisan}
            </span>
          </p>
        </div>
      </div>
    </a>
  );
}
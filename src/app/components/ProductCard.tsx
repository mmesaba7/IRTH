"use client";

import { useEffect, useState } from "react";
import { products } from "../data/products";
import { getCustomProducts } from "../data/productStorage";
import Link from "next/link";

type ProductCardProps = {
  slug: string;
};

export default function ProductCard({ slug }: ProductCardProps) {
  const customProducts = getCustomProducts();
  const product = products[slug] || customProducts.find((item) => item.slug === slug);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedProducts = JSON.parse(localStorage.getItem("irth-saved-products") || "[]");
    setSaved(savedProducts.includes(slug));
  }, [slug]);

  const toggleSaved = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const savedProducts = JSON.parse(localStorage.getItem("irth-saved-products") || "[]");
    let updated;
    if (savedProducts.includes(slug)) {
      updated = savedProducts.filter((item: string) => item !== slug);
      setSaved(false);
    } else {
      updated = [...savedProducts, slug];
      setSaved(true);
    }
    localStorage.setItem("irth-saved-products", JSON.stringify(updated));
    window.dispatchEvent(new Event("irth-saved-updated"));
  };

  if (!product) return null;

  const accentColors = {
    terracotta: "bg-[var(--color-terracotta)]",
    olive: "bg-[var(--color-olive)]",
    copper: "bg-[var(--color-copper)]",
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cart = JSON.parse(localStorage.getItem("irth-cart") || "[]");
    const cartItem = {
      slug: product.slug,
      artisan: product.artisan,
      name: product.name,
      price: product.price,
    };
    localStorage.setItem("irth-cart", JSON.stringify([...cart, cartItem]));
    window.dispatchEvent(new Event("irth-cart-updated"));
  };

  return (
    <Link href={`/product?slug=${product.slug}`} className="group block">
      <div className="card hover:shadow-[var(--shadow-elevated)] transition-all duration-300">
        {/* Image with Heritage Motif */}
        <div
          className={`relative aspect-[4/3] rounded-[var(--radius-md)] ${accentColors[product.accent]} overflow-hidden`}
        >
          {/* Heritage Motif (زخرفة تراثية خفيفة) */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-4 w-12 h-12 border border-[var(--color-ivory)]/30 rounded-full" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border border-[var(--color-ivory)]/20 rotate-45" />
            <div className="absolute inset-1/3 w-16 h-16 border border-[var(--color-ivory)]/10 rounded-full" />
          </div>

          <div className="absolute inset-4 rounded-[var(--radius-md)] border border-[var(--color-ivory)]/30" />
          <div className="absolute left-1/2 top-1/2 h-24 w-20 -translate-x-1/2 -translate-y-1/2 rounded-[45%] bg-[var(--color-ivory)]/80 shadow-lg transition-transform duration-500 group-hover:scale-105" />

          {/* Save Button */}
          <button
            onClick={toggleSaved}
            className={`absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)]/90 text-lg backdrop-blur-sm transition-colors ${
              saved ? "text-[var(--color-copper)]" : "text-[var(--text-muted)] hover:text-[var(--color-espresso)]"
            }`}
          >
            {saved ? "♥" : "♡"}
          </button>

          {/* Add to Cart */}
          <button
            onClick={handleAddToCart}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-espresso)] px-5 py-2 text-xs font-medium text-[var(--color-ivory)] opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-[var(--color-copper)]"
          >
            Add to cart 🛒
          </button>
        </div>

        {/* Content */}
        <div className="mt-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {product.country} · {product.category}
          </p>
          <h3 className="mt-1 font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
            {product.name}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">By {product.artisan}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{product.objectLabel}</p>
          <p className="mt-2 font-medium text-[var(--color-copper)]">${product.price}</p>
        </div>
      </div>
    </Link>
  );
}
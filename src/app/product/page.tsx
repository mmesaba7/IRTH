"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Button from "../components/Button";
import { products } from "../data/products";
import Header from "../components/Header";
import { getCustomProducts } from "../data/productStorage";

export default function ProductPage() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");
  const product = products[slug as keyof typeof products] ?? products["clay-vessel"];
  const [saved, setSaved] = useState(false);

useEffect(() => {
  if (!slug) return;

  const savedProducts = JSON.parse(
    localStorage.getItem("irth-saved-products") || "[]"
  );

  setSaved(savedProducts.includes(slug));
}, [slug]);
  const [quantity, setQuantity] = useState(1);
const customProducts = getCustomProducts();

const allProducts = [
  ...Object.values(products),
  ...customProducts,
];
return (
  <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
    <Header />

    <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
    <a
      href="/"
      className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--color-copper)]"
    >
      ← Back to crafts
    </a>

    <div className="mt-10 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
      <div>
        <div className={`relative aspect-square overflow-hidden rounded-[var(--radius-xl)] ${
  slug === "heritage-textile"
    ? "bg-[var(--color-olive)]"
    : slug === "copper-piece"
      ? "bg-[var(--color-copper)]"
      : "bg-[var(--color-terracotta)]"
}`}>
          <div className="absolute inset-8 rounded-[var(--radius-xl)] border border-[var(--color-antique-gold)]/40" />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-[58%] w-[42%] rotate-[-4deg] rounded-[45%_45%_38%_38%] bg-[var(--color-ivory)] shadow-[var(--shadow-card)]">
              <div className="absolute left-1/2 top-[12%] h-[72%] w-[70%] -translate-x-1/2 rounded-[45%] border border-[var(--color-bronze)]/50" />

              <div className="absolute bottom-[18%] left-1/2 h-px w-[58%] -translate-x-1/2 bg-[var(--color-bronze)]/50" />

              <div className="absolute bottom-[11%] left-1/2 h-3 w-[40%] -translate-x-1/2 rounded-full bg-[var(--color-bronze)]/60" />
            </div>
          </div>

          <div className="absolute bottom-6 left-6 rounded-[var(--radius-md)] bg-[var(--color-espresso)]/90 px-5 py-4 text-[var(--color-ivory)] backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.18em] opacity-70">
  {product.origin}
</p>

<p className="mt-1 font-[var(--font-display)] text-lg">
  {product.objectLabel}
</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4">
          <div className="aspect-square rounded-[var(--radius-lg)] bg-[var(--surface-muted)]" />
          <div className="aspect-square rounded-[var(--radius-lg)] bg-[var(--color-olive)]" />
          <div className="aspect-square rounded-[var(--radius-lg)] bg-[var(--color-copper)]" />
        </div>
      </div>

      <div className="flex flex-col justify-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
          {product.category} · {product.country}
        </p>

        <h1 className="mt-4 font-[var(--font-display)] text-4xl font-normal leading-tight text-[var(--color-espresso)] md:text-6xl">
          {product.name}
        </h1>

        <p className="mt-6 text-lg leading-8 text-[var(--text-secondary)]">
  {product.description}
</p>

        <div className="mt-8 flex items-center justify-between border-y border-[var(--border-soft)] py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Price
            </p>

            <p className="mt-1 text-2xl font-medium text-[var(--color-copper)]">
              {product.price}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
  if (!slug) return;

  const savedProducts = JSON.parse(
    localStorage.getItem("irth-saved-products") || "[]"
  );

  if (saved) {
    const updatedProducts = savedProducts.filter(
      (item: string) => item !== slug
    );

    localStorage.setItem(
      "irth-saved-products",
      JSON.stringify(updatedProducts)
    );

    setSaved(false);
  } else {
    localStorage.setItem(
      "irth-saved-products",
      JSON.stringify([...savedProducts, slug])
    );

    setSaved(true);
  }
}}
            aria-label="Save product"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-soft)] text-xl transition-colors hover:border-[var(--color-copper)] hover:text-[var(--color-copper)]"
          >
            {saved ? "♥" : "♡"}
          </button>
        </div>

        <div className="mt-7">
          <p className="text-sm font-medium text-[var(--color-espresso)]">
            Quantity
          </p>

          <div className="mt-3 flex w-fit items-center rounded-[var(--radius-md)] border border-[var(--border-soft)]">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="flex h-11 w-11 items-center justify-center text-lg transition-colors hover:text-[var(--color-copper)]"
            >
              −
            </button>

            <span className="w-10 text-center text-sm">
              {quantity}
            </span>

            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="flex h-11 w-11 items-center justify-center text-lg transition-colors hover:text-[var(--color-copper)]"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-7">
          <Button
  onClick={() => {
  if (!slug) return;

  const cart = JSON.parse(
    localStorage.getItem("irth-cart") || "[]"
  );

  const updatedCart = [...cart];

  for (let i = 0; i < quantity; i++) {
    updatedCart.push(slug);
  }

  localStorage.setItem(
    "irth-cart",
    JSON.stringify(updatedCart)
  );

  window.dispatchEvent(new Event("irth-cart-updated"));

  window.location.href = "/cart";
}}
>
  Add to cart
</Button>
        </div>

        <div className="mt-10 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-olive)]">
            Made by
          </p>

          <div className="mt-3 flex items-center justify-between gap-6">
            <div>
              <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
                {product.artisan}
              </h2>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
  {product.origin} · {product.artisanRole}
</p>
            </div>

            <a
              href="#"
              className="shrink-0 text-sm font-medium text-[var(--color-copper)] transition-colors hover:text-[var(--color-espresso)]"
            >
              View profile →
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section className="border-y border-[var(--border-soft)] bg-[var(--surface)]">
    <div className="mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-20">
      <div className="grid gap-10 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-antique-gold)]">
            Material
          </p>

          <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">
  {product.origin}, where traditional craft knowledge continues to be
  passed between generations.
</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-antique-gold)]">
            Origin
          </p>

          <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">
            Upper Egypt, where pottery traditions have been passed between
            generations.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-antique-gold)]">
            Story
          </p>

          <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">
  {product.story}
</p>
        </div>
      </div>
    </div>
  </section>

  <footer className="bg-[var(--color-espresso)] text-[var(--color-ivory)]">
    <div className="mx-auto max-w-[var(--container-max)] px-6 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-[var(--font-display)] text-2xl tracking-[0.08em]">
          IRTH
        </p>

        <p className="text-sm text-[var(--color-ivory)]/60">
          Heritage · Craft · Human
        </p>
      </div>
    </div>
  </footer>
</main>

);
}

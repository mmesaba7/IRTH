"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import { products } from "../data/products";

export default function CartPage() {
  const [cartItems, setCartItems] = useState<string[]>([]);
const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
  const cart = JSON.parse(
    localStorage.getItem("irth-cart") || "[]"
  );

  const initialQuantities: Record<string, number> = {};

  cart.forEach((slug: string) => {
    initialQuantities[slug] = (initialQuantities[slug] || 0) + 1;
  });

  setCartItems(Object.keys(initialQuantities));
  setQuantities(initialQuantities);
}, []);
  const total = Object.entries(quantities).reduce(
  (sum, [slug, quantity]) => {
    const product = products[slug as keyof typeof products];

    return product ? sum + product.price * quantity : sum;
  },
  0
);

  return (
  <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
    <Header />

    <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
          Your selection
        </p>

        <h1 className="mt-3 font-[var(--font-display)] text-5xl font-normal text-[var(--color-espresso)]">
          Your cart
        </h1>

        {cartItems.length === 0 ? (
          <div className="mt-12 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              Your cart is empty.
            </p>

            <a
              href="/"
              className="mt-5 inline-block text-sm font-medium text-[var(--color-copper)]"
            >
              Explore crafts →
            </a>
          </div>
        ) : (
          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_360px]">
            
              
                    

                   <div className="space-y-5">
  {Object.entries(quantities).map(([slug, quantity]) => {
    const product =
      products[slug as keyof typeof products];

    if (!product) return null;

    return (
      <div
        key={slug}
        className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5"
      >
        <div className="flex gap-5">
          <a
            href={`/product?slug=${slug}`}
            className={`h-28 w-28 shrink-0 rounded-[var(--radius-md)] ${
              product.accent === "olive"
                ? "bg-[var(--color-olive)]"
                : product.accent === "copper"
                  ? "bg-[var(--color-copper)]"
                  : "bg-[var(--color-terracotta)]"
            }`}
          />

          <div className="flex flex-1 items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {product.country}
              </p>

              <h2 className="mt-2 font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
                {product.name}
              </h2>

              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                By {product.artisan}
              </p>

              <div className="mt-4 flex items-center rounded-[var(--radius-md)] border border-[var(--border-soft)]">
                <button
                  type="button"
                  onClick={() => {
  if (quantity <= 1) return;

  const updatedQuantities = {
    ...quantities,
    [slug]: quantity - 1,
  };

  setQuantities(updatedQuantities);

  const updatedCart: string[] = [];

  Object.entries(updatedQuantities).forEach(
    ([productSlug, productQuantity]) => {
      for (let i = 0; i < productQuantity; i++) {
        updatedCart.push(productSlug);
      }
    }
  );

  localStorage.setItem(
    "irth-cart",
    JSON.stringify(updatedCart)
  );

  setCartItems(Object.keys(updatedQuantities));
}}
                  className="flex h-9 w-9 items-center justify-center text-lg hover:text-[var(--color-copper)]"
                >
                  −
                </button>

                <span className="w-10 text-center text-sm">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={() => {
  const updatedQuantities = {
    ...quantities,
    [slug]: quantity + 1,
  };

  setQuantities(updatedQuantities);

  const updatedCart: string[] = [];

  Object.entries(updatedQuantities).forEach(
    ([productSlug, productQuantity]) => {
      for (let i = 0; i < productQuantity; i++) {
        updatedCart.push(productSlug);
      }
    }
  );

  localStorage.setItem(
    "irth-cart",
    JSON.stringify(updatedCart)
  );

  setCartItems(Object.keys(updatedQuantities));
}}
                  className="flex h-9 w-9 items-center justify-center text-lg hover:text-[var(--color-copper)]"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col items-end gap-4">
  <p className="font-medium text-[var(--color-copper)]">
    ${product.price * quantity}
  </p>

  <button
    type="button"
    onClick={() => {
      const updatedQuantities = { ...quantities };
      delete updatedQuantities[slug];

      setQuantities(updatedQuantities);

      const updatedCart: string[] = [];

      Object.entries(updatedQuantities).forEach(
        ([productSlug, productQuantity]) => {
          for (let i = 0; i < productQuantity; i++) {
            updatedCart.push(productSlug);
          }
        }
      );

      localStorage.setItem(
        "irth-cart",
        JSON.stringify(updatedCart)
      );

      setCartItems(Object.keys(updatedQuantities));

      window.dispatchEvent(new Event("irth-cart-updated"));
    }}
    className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--color-copper)]"
  >
    Remove
  </button>
</div>
          </div>
        </div>
      </div>
    );
  })}
</div>

            <div className="h-fit rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-7">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-olive)]">
                Summary
              </p>

              <div className="mt-6 flex items-center justify-between border-b border-[var(--border-soft)] pb-5">
                <span className="text-sm text-[var(--text-secondary)]">
                  Items
                </span>

                <span className="text-sm">
  {Object.values(quantities).reduce(
    (sum, quantity) => sum + quantity,
    0
  )}
</span>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="font-medium text-[var(--color-espresso)]">
                  Total
                </span>

                <span className="text-xl font-medium text-[var(--color-copper)]">
                  ${total}
                </span>
              </div>

              <a
  href="/checkout"
  className="mt-7 block w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-center text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
>
  Continue to checkout
</a>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
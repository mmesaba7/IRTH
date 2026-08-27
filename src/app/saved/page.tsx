
"use client";

import { useEffect, useState } from "react";
import { products } from "../data/products";


export default function SavedPage() {
  const [savedProducts, setSavedProducts] = useState<string[]>([]);

  useEffect(() => {
    const saved = JSON.parse(
      localStorage.getItem("irth-saved-products") || "[]"
    );

    setSavedProducts(saved);
  }, []);

  const removeSaved = (slug: string) => {
    const updated = savedProducts.filter((item) => item !== slug);

    localStorage.setItem(
      "irth-saved-products",
      JSON.stringify(updated)
    );

    setSavedProducts(updated);
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-soft)]">
        <div className="mx-auto max-w-[var(--container-max)] px-6 py-5">
          <a
            href="/"
            className="font-[var(--font-display)] text-2xl tracking-[0.08em] text-[var(--color-espresso)]"
          >
            IRTH
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
          Your collection
        </p>

        <h1 className="mt-3 font-[var(--font-display)] text-5xl font-normal text-[var(--color-espresso)]">
          Saved crafts
        </h1>

        {savedProducts.length === 0 ? (
          <div className="mt-12 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              You haven't saved any crafts yet.
            </p>

            <a
              href="/"
              className="mt-5 inline-block text-sm font-medium text-[var(--color-copper)]"
            >
              Discover crafts →
            </a>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {savedProducts.map((slug) => {
              const product =
                products[slug as keyof typeof products];

              if (!product) {
                return null;
              }

              return (
                <div
                  key={slug}
                  className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]"
                >
                  <a href={`/product/${slug}`}>
                    <div
                      className={
                        "aspect-[4/3] " +
                        (product.accent === "olive"
                          ? "bg-[var(--color-olive)]"
                          : product.accent === "copper"
                            ? "bg-[var(--color-copper)]"
                            : "bg-[var(--color-terracotta)]")
                      }
                    />

                    <div className="p-6">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        {product.country}
                      </p>

                      <h2 className="mt-2 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                        {product.name}
                      </h2>

                      <p className="mt-3 text-sm text-[var(--text-secondary)]">
                        By {product.artisan}
                      </p>

                      <p className="mt-4 text-sm font-medium text-[var(--color-copper)]">
                        ${product.price}
                      </p>
                    </div>
                  </a>

                  <div className="px-6 pb-6">
                    <button
                      type="button"
                      onClick={() => removeSaved(slug)}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-3 text-sm font-medium text-[var(--color-espresso)] transition-colors hover:border-[var(--color-copper)] hover:text-[var(--color-copper)]"
                    >
                      Remove from saved
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}


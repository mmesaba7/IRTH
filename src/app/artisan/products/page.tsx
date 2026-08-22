
"use client";

import Link from "next/link";
import Header from "../../components/Header";
import { useEffect, useState } from "react";
import {
  getCustomProducts,
  deleteCustomProduct,
  type MarketplaceProduct,
} from "../../data/productStorage";

export default function ArtisanProductsPage() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setProducts(getCustomProducts());
  }, []);

  const handleDelete = (slug: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    deleteCustomProduct(slug);

    setProducts(getCustomProducts());
    setMessage("Product deleted successfully.");

    setTimeout(() => {
      setMessage("");
    }, 2500);
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-12 md:py-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Artisan dashboard
            </p>

            <h1 className="mt-3 font-[var(--font-display)] text-5xl font-normal leading-tight text-[var(--color-espresso)] md:text-6xl">
              My products
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              Manage the products you offer through the IRTH marketplace.
            </p>
          </div>

          <Link
            href="/product/new"
            className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-3 text-sm font-medium text-[var(--color-ivory)] transition-colors hover:bg-[var(--color-copper)]"
          >
            + Add new product
          </Link>
        </div>

        {message && (
          <div className="mt-8 rounded-[var(--radius-md)] bg-[var(--color-olive)] px-5 py-4 text-sm text-[var(--color-ivory)]">
            {message}
          </div>
        )}

        {products.length === 0 ? (
          <div className="mt-12 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-10 text-center">
            <p className="font-[var(--font-display)] text-3xl text-[var(--color-espresso)]">
              No products yet
            </p>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Add your first handmade product to start building your
              marketplace inventory.
            </p>

            <Link
              href="/product/new"
              className="mt-7 inline-flex rounded-[var(--radius-md)] bg-[var(--color-copper)] px-6 py-3 text-sm font-medium text-[var(--color-ivory)]"
            >
              Add your first product
            </Link>
          </div>
        ) : (
          <div className="mt-12 space-y-5">
            {products.map((product) => (
              <article
                key={product.slug}
                className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 md:p-7"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {product.category && (
                        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                          {product.category}
                        </span>
                      )}

                      {product.madeToOrder && (
                        <span className="rounded-full bg-[var(--color-olive)] px-3 py-1 text-xs text-[var(--color-ivory)]">
                          Made to Order
                        </span>
                      )}

                      {product.oneOfAKind && (
                        <span className="rounded-full bg-[var(--color-copper)] px-3 py-1 text-xs text-[var(--color-ivory)]">
                          One of a Kind
                        </span>
                      )}
                    </div>

                    <h2 className="mt-4 font-[var(--font-display)] text-3xl text-[var(--color-espresso)]">
                      {product.name}
                    </h2>

                    {product.description && (
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                        {product.description}
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--text-secondary)]">
                      {product.material && (
                        <span>
                          <strong className="text-[var(--color-espresso)]">
                            Material:
                          </strong>{" "}
                          {product.material}
                        </span>
                      )}

                      {product.dimensions && (
                        <span>
                          <strong className="text-[var(--color-espresso)]">
                            Size:
                          </strong>{" "}
                          {product.dimensions}
                        </span>
                      )}

                      {product.weight && (
                        <span>
                          <strong className="text-[var(--color-espresso)]">
                            Weight:
                          </strong>{" "}
                          {product.weight}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full shrink-0 lg:w-64">
                    <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-5">
                      <p className="text-xs uppercase tracking-[0.15em] text-[var(--text-muted)]">
                        Price
                      </p>

                      <p className="mt-1 font-[var(--font-display)] text-3xl text-[var(--color-espresso)]">
                        ${Number(product.price || 0).toLocaleString()}
                      </p>

                      <p className="mt-3 text-sm text-[var(--text-secondary)]">
                        {product.madeToOrder
                          ? "Made to order"
                          : `${product.quantity ?? 0} available`}
                      </p>

                      {product.customization && (
                        <p className="mt-1 text-sm text-[var(--color-olive)]">
                          Customization available
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border-soft)] pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => handleDelete(product.slug)}
                    className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-3 text-sm text-[var(--text-secondary)] transition-colors hover:border-red-300 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

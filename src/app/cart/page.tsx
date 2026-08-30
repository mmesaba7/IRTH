"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";

type LegacyCartItem = {
  slug: string;
  artisan: string;
  name: string;
  price: number;
};

type QuoteItemStatus =
  | "available"
  | "product_unavailable"
  | "not_priced_for_market"
  | "out_of_stock"
  | "insufficient_stock";

type QuoteItem = {
  slug: string;
  requestedQuantity: number;
  status: QuoteItemStatus;
  product: null | {
    id: string;
    name_ar: string | null;
    name_en: string;
    artisan_name_ar: string | null;
    artisan_name_en: string;
    made_to_order: boolean;
    preparation_time: string | null;
    available_quantity: number | null;
  };
  unitPrice: string | null;
  lineTotal: string | null;
};

type CartQuote = {
  market: {
    id: string;
    slug: string;
    currency_code: string;
  };
  items: QuoteItem[];
  subtotal: string;
  canCheckout: boolean;
};

function groupCart(cart: LegacyCartItem[]) {
  const grouped: Record<string, number> = {};

  for (const item of cart) {
    if (!item?.slug) continue;
    grouped[item.slug] = (grouped[item.slug] ?? 0) + 1;
  }

  return grouped;
}

function availabilityMessage(item: QuoteItem) {
  switch (item.status) {
    case "not_priced_for_market":
      return "This product does not have an approved price for the selected market yet.";
    case "out_of_stock":
      return "This product is currently out of stock.";
    case "insufficient_stock":
      return `Only ${item.product?.available_quantity ?? 0} currently available.`;
    case "product_unavailable":
      return "This product is no longer available for purchase.";
    default:
      return null;
  }
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<LegacyCartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteError, setQuoteError] = useState("");

  const loadQuote = async (grouped: Record<string, number>) => {
    const items = Object.entries(grouped).map(([slug, quantity]) => ({
      slug,
      quantity,
    }));

    if (items.length === 0) {
      setQuote(null);
      setQuoteError("");
      setQuoteLoading(false);
      return;
    }

    setQuoteLoading(true);
    setQuoteError("");

    try {
      const response = await fetch("/api/cart/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({ items }),
      });

      const payload = (await response.json()) as {
        quote?: CartQuote;
        error?: string;
      };

      if (!response.ok || !payload.quote) {
        setQuote(null);
        setQuoteError(
          response.status === 409
            ? "Select a market before pricing your cart."
            : payload.error ?? "Unable to verify your cart right now."
        );
        return;
      }

      setQuote(payload.quote);
    } catch (error) {
      console.error("Could not load secure cart quote:", error);
      setQuote(null);
      setQuoteError("Unable to verify your cart right now.");
    } finally {
      setQuoteLoading(false);
    }
  };

  const loadCart = async () => {
    const cart = JSON.parse(
      localStorage.getItem("irth-cart") || "[]"
    ) as LegacyCartItem[];
    const grouped = groupCart(cart);

    setCartItems(cart);
    setQuantities(grouped);
    await loadQuote(grouped);
  };

  useEffect(() => {
    void loadCart();

    const handleCartUpdated = () => {
      void loadCart();
    };

    window.addEventListener("irth-cart-updated", handleCartUpdated);

    return () => {
      window.removeEventListener("irth-cart-updated", handleCartUpdated);
    };
  }, []);

  const saveCart = async (updatedCart: LegacyCartItem[]) => {
    const grouped = groupCart(updatedCart);

    localStorage.setItem("irth-cart", JSON.stringify(updatedCart));
    setCartItems(updatedCart);
    setQuantities(grouped);
    window.dispatchEvent(new Event("irth-cart-updated"));
    await loadQuote(grouped);
  };

  const quoteBySlug = new Map(
    (quote?.items ?? []).map((item) => [item.slug, item])
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
            <Link
              href="/"
              className="mt-5 inline-block text-sm font-medium text-[var(--color-copper)]"
            >
              Explore crafts →
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              {Object.entries(quantities).map(([slug, quantity]) => {
                const storedItem = cartItems.find((item) => item.slug === slug);
                const quotedItem = quoteBySlug.get(slug);
                const unavailableMessage = quotedItem
                  ? availabilityMessage(quotedItem)
                  : null;
                const canIncrease = Boolean(
                  quotedItem?.status === "available" &&
                    (quotedItem.product?.made_to_order ||
                      (quotedItem.product?.available_quantity ?? 0) > quantity)
                );

                if (!storedItem) return null;

                return (
                  <div
                    key={slug}
                    className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5"
                  >
                    <div className="flex gap-5">
                      <div className="h-28 w-28 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-terracotta)]" />

                      <div className="flex flex-1 items-start justify-between gap-4">
                        <div>
                          <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
                            {quotedItem?.product?.name_en ??
                              (quoteLoading ? "Checking product…" : slug)}
                          </h2>

                          {quotedItem?.product && (
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                              By {quotedItem.product.artisan_name_en}
                            </p>
                          )}

                          {unavailableMessage && (
                            <p className="mt-3 max-w-md text-sm text-[var(--color-terracotta)]">
                              {unavailableMessage}
                            </p>
                          )}

                          {quotedItem?.product?.made_to_order &&
                            quotedItem.product.preparation_time && (
                              <p className="mt-3 text-xs text-[var(--text-muted)]">
                                Preparation: {quotedItem.product.preparation_time}
                              </p>
                            )}

                          <div className="mt-4 flex w-fit items-center rounded-[var(--radius-md)] border border-[var(--border-soft)]">
                            <button
                              type="button"
                              onClick={() => {
                                if (quantity <= 1) return;
                                const index = cartItems.findIndex(
                                  (item) => item.slug === slug
                                );
                                if (index === -1) return;
                                const newCart = [...cartItems];
                                newCart.splice(index, 1);
                                void saveCart(newCart);
                              }}
                              disabled={quantity <= 1 || quoteLoading}
                              className="flex h-9 w-9 items-center justify-center text-lg hover:text-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              −
                            </button>

                            <span className="w-10 text-center text-sm">
                              {quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                const newCart = [...cartItems, storedItem];
                                void saveCart(newCart);
                              }}
                              disabled={quoteLoading || !canIncrease}
                              className="flex h-9 w-9 items-center justify-center text-lg hover:text-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-4 text-right">
                          <p className="font-medium text-[var(--color-copper)]">
                            {quotedItem?.lineTotal && quote
                              ? `${quote.market.currency_code} ${quotedItem.lineTotal}`
                              : "—"}
                          </p>

                          <button
                            type="button"
                            onClick={() => {
                              const newCart = cartItems.filter(
                                (item) => item.slug !== slug
                              );
                              void saveCart(newCart);
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
                Secure summary
              </p>

              <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
                Prices and availability are verified by the server for your selected market.
              </p>

              <div className="mt-6 flex items-center justify-between border-b border-[var(--border-soft)] pb-5">
                <span className="text-sm text-[var(--text-secondary)]">
                  Items
                </span>
                <span className="text-sm">{cartItems.length}</span>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="font-medium text-[var(--color-espresso)]">
                  Subtotal
                </span>
                <span className="text-xl font-medium text-[var(--color-copper)]">
                  {quoteLoading
                    ? "Checking…"
                    : quote
                      ? `${quote.market.currency_code} ${quote.subtotal}`
                      : "—"}
                </span>
              </div>

              {quoteError && (
                <p className="mt-5 text-sm leading-6 text-[var(--color-terracotta)]">
                  {quoteError}
                </p>
              )}

              {quote?.canCheckout ? (
                <Link
                  href="/checkout"
                  className="mt-7 block w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-center text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
                >
                  Continue to checkout
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-7 block w-full cursor-not-allowed rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-center text-sm font-medium text-[var(--color-ivory)] opacity-40"
                >
                  Continue to checkout
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

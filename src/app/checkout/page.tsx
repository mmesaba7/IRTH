"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Header from "../components/Header";

type StoredCartItem = {
  slug: string;
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
    name_en: string;
    artisan_name_en: string;
  };
  originalLineTotal: string | null;
  promotionDiscount: string | null;
  couponDiscount: string | null;
  lineTotal: string | null;
};

type CheckoutQuote = {
  market: {
    slug: string;
    currency_code: string;
  };
  items: QuoteItem[];
  subtotalBeforePromotions: string;
  promotionDiscountTotal: string;
  couponDiscountTotal: string;
  couponCode: string | null;
  subtotal: string;
  canCheckout: boolean;
};

type QuoteState = {
  requestKey: string;
  quote: CheckoutQuote | null;
  error: string;
};

const EMPTY_CART = "[]";
const CHECKOUT_COUPON_KEY = "irth-checkout-coupon";

function subscribeToCart(onStoreChange: () => void) {
  const handleCartUpdated = () => onStoreChange();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === "irth-cart") onStoreChange();
  };

  window.addEventListener("irth-cart-updated", handleCartUpdated);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("irth-cart-updated", handleCartUpdated);
    window.removeEventListener("storage", handleStorage);
  };
}

function getCartSnapshot() {
  return localStorage.getItem("irth-cart") ?? EMPTY_CART;
}

function getServerCartSnapshot() {
  return EMPTY_CART;
}

function parseCart(snapshot: string): StoredCartItem[] {
  try {
    const parsed = JSON.parse(snapshot) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is StoredCartItem =>
        typeof item === "object" &&
        item !== null &&
        "slug" in item &&
        typeof (item as { slug?: unknown }).slug === "string" &&
        (item as { slug: string }).slug.trim().length > 0
    );
  } catch {
    return [];
  }
}

function groupCart(items: StoredCartItem[]) {
  const grouped: Record<string, number> = {};

  for (const item of items) {
    const slug = item.slug.trim();
    grouped[slug] = (grouped[slug] ?? 0) + 1;
  }

  return Object.entries(grouped).map(([slug, quantity]) => ({ slug, quantity }));
}

function hasPositiveMoney(value: string | null | undefined) {
  return Boolean(value && Number(value) > 0);
}

export default function CheckoutPage() {
  const cartSnapshot = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerCartSnapshot
  );
  const cartItems = useMemo(() => parseCart(cartSnapshot), [cartSnapshot]);
  const quoteItems = useMemo(() => groupCart(cartItems), [cartItems]);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponReady, setCouponReady] = useState(false);

  useEffect(() => {
    setCouponCode(sessionStorage.getItem(CHECKOUT_COUPON_KEY));
    setCouponReady(true);
  }, []);

  const requestBody = useMemo(
    () => JSON.stringify({ items: quoteItems, couponCode }),
    [quoteItems, couponCode]
  );
  const [quoteState, setQuoteState] = useState<QuoteState>({
    requestKey: "",
    quote: null,
    error: "",
  });

  useEffect(() => {
    if (!couponReady || quoteItems.length === 0) return;

    const controller = new AbortController();

    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: requestBody,
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          quote?: CheckoutQuote;
          error?: string;
        };

        if (controller.signal.aborted) return;

        if (!response.ok || !payload.quote) {
          setQuoteState({
            requestKey: requestBody,
            quote: null,
            error:
              response.status === 409
                ? "Select a market before continuing to checkout."
                : payload.error ?? "Unable to verify checkout right now.",
          });
          return;
        }

        setQuoteState({ requestKey: requestBody, quote: payload.quote, error: "" });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Could not load checkout quote:", error);
        setQuoteState({
          requestKey: requestBody,
          quote: null,
          error: "Unable to verify checkout right now.",
        });
      });

    return () => controller.abort();
  }, [couponReady, quoteItems.length, requestBody]);

  const quoteLoading =
    !couponReady || (quoteItems.length > 0 && quoteState.requestKey !== requestBody);
  const quote = quoteState.requestKey === requestBody ? quoteState.quote : null;
  const quoteError = quoteState.requestKey === requestBody ? quoteState.error : "";
  const currency = quote?.market.currency_code ?? "";

  if (cartItems.length === 0) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
        <Header />
        <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
          <div className="rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <h1 className="font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              Your cart is empty
            </h1>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Add a product before continuing to checkout.
            </p>
            <Link href="/cart" className="mt-6 inline-block text-sm font-medium text-[var(--color-copper)]">
              Back to cart →
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
          Secure checkout
        </p>
        <h1 className="mt-3 font-[var(--font-display)] text-5xl font-normal text-[var(--color-espresso)]">
          Review your order
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          This summary is revalidated by the server using your selected market. Shipping, payment and order creation are not part of this step yet.
        </p>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            {quoteLoading && (
              <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-7 text-sm text-[var(--text-secondary)]">
                Verifying your cart…
              </div>
            )}

            {quoteError && (
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-terracotta)] bg-[var(--surface)] p-7">
                <p className="text-sm text-[var(--color-terracotta)]">{quoteError}</p>
                <Link href="/cart" className="mt-4 inline-block text-sm font-medium text-[var(--color-copper)]">
                  Return to cart →
                </Link>
              </div>
            )}

            {quote?.items.map((item) => (
              <div key={item.slug} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
                      {item.product?.name_en ?? item.slug}
                    </h2>
                    {item.product && (
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        By {item.product.artisan_name_en}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      Quantity: {item.requestedQuantity}
                    </p>
                    {item.status !== "available" && (
                      <p className="mt-3 text-sm text-[var(--color-terracotta)]">
                        This item must be resolved in your cart before checkout.
                      </p>
                    )}
                    {item.status === "available" && (
                      <div className="mt-3 space-y-1 text-xs text-[var(--color-olive)]">
                        {hasPositiveMoney(item.promotionDiscount) && (
                          <p>Promotion saved {currency} {item.promotionDiscount}</p>
                        )}
                        {hasPositiveMoney(item.couponDiscount) && (
                          <p>Coupon saved {currency} {item.couponDiscount}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    {item.originalLineTotal && item.lineTotal && item.originalLineTotal !== item.lineTotal && (
                      <p className="text-xs text-[var(--text-muted)] line-through">
                        {currency} {item.originalLineTotal}
                      </p>
                    )}
                    <p className="mt-1 font-medium text-[var(--color-copper)]">
                      {item.lineTotal ? `${currency} ${item.lineTotal}` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="h-fit rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-7">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-olive)]">
              Trusted summary
            </p>
            <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
              Browser-stored prices are ignored. All money shown here comes from the server quote.
            </p>

            <div className="mt-6 space-y-3 border-b border-[var(--border-soft)] pb-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Merchandise</span>
                <span>{quote ? `${currency} ${quote.subtotalBeforePromotions}` : "—"}</span>
              </div>
              {quote && hasPositiveMoney(quote.promotionDiscountTotal) && (
                <div className="flex items-center justify-between text-[var(--color-olive)]">
                  <span>Promotions</span>
                  <span>− {currency} {quote.promotionDiscountTotal}</span>
                </div>
              )}
              {quote && hasPositiveMoney(quote.couponDiscountTotal) && (
                <div className="flex items-center justify-between text-[var(--color-olive)]">
                  <span>Coupon{quote.couponCode ? ` (${quote.couponCode})` : ""}</span>
                  <span>− {currency} {quote.couponDiscountTotal}</span>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <span className="font-medium text-[var(--color-espresso)]">Merchandise subtotal</span>
              <span className="text-2xl font-medium text-[var(--color-copper)]">
                {quote ? `${currency} ${quote.subtotal}` : "—"}
              </span>
            </div>

            {!quote?.canCheckout && !quoteLoading && (
              <p className="mt-4 text-xs leading-5 text-[var(--color-terracotta)]">
                Checkout cannot continue until every item is valid for the selected market and inventory.
              </p>
            )}

            <Link
              href="/cart"
              className="mt-7 block w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] px-6 py-3 text-center text-sm font-medium text-[var(--color-espresso)] transition hover:border-[var(--color-copper)]"
            >
              Back to cart
            </Link>

            <button
              type="button"
              disabled
              className="mt-3 w-full cursor-not-allowed rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] opacity-50"
            >
              Continue — next checkout step
            </button>
            <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
              Customer details and order creation will be added in the next approved Checkout task.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}

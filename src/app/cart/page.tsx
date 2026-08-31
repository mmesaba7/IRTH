"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Header from "../components/Header";

type LegacyCartItem = {
  slug: string;
  customizationText?: string | null;
};

type QuoteItemStatus =
  | "available"
  | "product_unavailable"
  | "not_priced_for_market"
  | "out_of_stock"
  | "insufficient_stock";

type CouponQuoteStatus =
  | "not_requested"
  | "applied"
  | "invalid_or_unavailable"
  | "not_applicable"
  | "minimum_not_met"
  | "promotion_preferred"
  | "no_discount";

type ShippingQuoteStatus =
  | "flat_rate"
  | "free_shipping"
  | "configuration_missing";

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
  originalLineTotal: string | null;
  promotionDiscount: string | null;
  couponDiscount: string | null;
  lineTotal: string | null;
};

type CartQuote = {
  market: {
    id: string;
    slug: string;
    currency_code: string;
  };
  items: QuoteItem[];
  subtotalBeforePromotions: string;
  promotionDiscountTotal: string;
  subtotalBeforeCoupon: string;
  couponDiscountTotal: string;
  couponCode: string | null;
  couponStatus: CouponQuoteStatus;
  subtotal: string;
  merchandiseSubtotal: string;
  shippingFee: string | null;
  freeShippingThreshold: string | null;
  shippingStatus: ShippingQuoteStatus;
  finalTotal: string | null;
  canCheckout: boolean;
};

type QuoteState = {
  requestKey: string;
  quote: CartQuote | null;
  error: string;
};

const EMPTY_CART_SNAPSHOT = "[]";
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
  return localStorage.getItem("irth-cart") ?? EMPTY_CART_SNAPSHOT;
}

function getServerCartSnapshot() {
  return EMPTY_CART_SNAPSHOT;
}

function parseCartSnapshot(snapshot: string): LegacyCartItem[] {
  try {
    const parsed = JSON.parse(snapshot) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is LegacyCartItem =>
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

function groupCart(cart: LegacyCartItem[]) {
  const grouped: Record<string, number> = {};
  for (const item of cart) {
    const slug = item.slug.trim();
    grouped[slug] = (grouped[slug] ?? 0) + 1;
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

function couponStatusMessage(status: CouponQuoteStatus) {
  switch (status) {
    case "applied":
      return "Coupon applied successfully.";
    case "invalid_or_unavailable":
      return "This coupon is invalid or unavailable for the selected market.";
    case "not_applicable":
      return "This coupon does not apply to the products in your cart.";
    case "minimum_not_met":
      return "Your eligible items do not meet this coupon’s minimum order amount.";
    case "promotion_preferred":
      return "Your current product promotion gives you the better price, so it was kept.";
    case "no_discount":
      return "This coupon does not create an additional discount for this cart.";
    default:
      return "";
  }
}

function hasPositiveMoney(value: string | null | undefined) {
  if (!value) return false;
  return Number(value) > 0;
}

export default function CartPage() {
  const cartSnapshot = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerCartSnapshot
  );
  const cartItems = useMemo(() => parseCartSnapshot(cartSnapshot), [cartSnapshot]);
  const quantities = useMemo(() => groupCart(cartItems), [cartItems]);
  const quoteItems = useMemo(
    () => Object.entries(quantities).map(([slug, quantity]) => ({ slug, quantity })),
    [quantities]
  );
  const [couponInput, setCouponInput] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const quoteRequestBody = useMemo(
    () =>
      JSON.stringify({
        items: quoteItems,
        couponCode: appliedCouponCode,
      }),
    [quoteItems, appliedCouponCode]
  );
  const [quoteState, setQuoteState] = useState<QuoteState>({
    requestKey: "",
    quote: null,
    error: "",
  });

  useEffect(() => {
    if (quoteItems.length === 0) return;

    const controller = new AbortController();

    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: quoteRequestBody,
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as { quote?: CartQuote; error?: string };
        if (controller.signal.aborted) return;

        if (!response.ok || !payload.quote) {
          setQuoteState({
            requestKey: quoteRequestBody,
            quote: null,
            error:
              response.status === 409
                ? "Select a market before pricing your cart."
                : payload.error ?? "Unable to verify your cart right now.",
          });
          return;
        }

        setQuoteState({ requestKey: quoteRequestBody, quote: payload.quote, error: "" });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Could not load secure cart quote:", error);
        setQuoteState({
          requestKey: quoteRequestBody,
          quote: null,
          error: "Unable to verify your cart right now.",
        });
      });

    return () => controller.abort();
  }, [quoteItems.length, quoteRequestBody]);

  const quoteLoading = quoteItems.length > 0 && quoteState.requestKey !== quoteRequestBody;
  const quote = quoteState.requestKey === quoteRequestBody ? quoteState.quote : null;
  const quoteError = quoteState.requestKey === quoteRequestBody ? quoteState.error : "";
  const currency = quote?.market.currency_code ?? "";

  const saveCart = (updatedCart: LegacyCartItem[]) => {
    localStorage.setItem("irth-cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("irth-cart-updated"));
  };

  const quoteBySlug = new Map((quote?.items ?? []).map((item) => [item.slug, item]));

  const applyCoupon = () => {
    const normalized = couponInput.trim();
    if (!normalized || quoteLoading) return;
    setCouponInput(normalized);
    setAppliedCouponCode(normalized);
  };

  const removeCoupon = () => {
    setAppliedCouponCode(null);
    setCouponInput("");
  };

  const prepareCheckout = () => {
    if (quote?.couponCode) {
      sessionStorage.setItem(CHECKOUT_COUPON_KEY, quote.couponCode);
    } else {
      sessionStorage.removeItem(CHECKOUT_COUPON_KEY);
    }
  };

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
            <p className="text-lg text-[var(--text-secondary)]">Your cart is empty.</p>
            <Link href="/" className="mt-5 inline-block text-sm font-medium text-[var(--color-copper)]">
              Explore crafts →
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              {Object.entries(quantities).map(([slug, quantity]) => {
                const storedItem = cartItems.find((item) => item.slug === slug);
                const quotedItem = quoteBySlug.get(slug);
                const unavailableMessage = quotedItem ? availabilityMessage(quotedItem) : null;
                const canIncrease = Boolean(
                  quotedItem?.status === "available" &&
                    (quotedItem.product?.made_to_order ||
                      (quotedItem.product?.available_quantity ?? 0) > quantity)
                );

                if (!storedItem) return null;

                return (
                  <div key={slug} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
                    <div className="flex gap-5">
                      <div className="h-28 w-28 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-terracotta)]" />
                      <div className="flex flex-1 items-start justify-between gap-4">
                        <div>
                          <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
                            {quotedItem?.product?.name_en ?? (quoteLoading ? "Checking product…" : slug)}
                          </h2>
                          {quotedItem?.product && (
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                              By {quotedItem.product.artisan_name_en}
                            </p>
                          )}
                          {storedItem.customizationText && (
                            <div className="mt-3 max-w-xl rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3">
                              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">Customization request</p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--color-espresso)]">{storedItem.customizationText}</p>
                            </div>
                          )}
                          {unavailableMessage && (
                            <p className="mt-3 max-w-md text-sm text-[var(--color-terracotta)]">{unavailableMessage}</p>
                          )}
                          {quotedItem?.product?.made_to_order && quotedItem.product.preparation_time && (
                            <p className="mt-3 text-xs text-[var(--text-muted)]">
                              Preparation: {quotedItem.product.preparation_time}
                            </p>
                          )}

                          {quotedItem?.status === "available" && (
                            <div className="mt-3 space-y-1 text-xs">
                              {hasPositiveMoney(quotedItem.promotionDiscount) && (
                                <p className="text-[var(--color-olive)]">
                                  Promotion saved {currency} {quotedItem.promotionDiscount}
                                </p>
                              )}
                              {hasPositiveMoney(quotedItem.couponDiscount) && (
                                <p className="text-[var(--color-olive)]">
                                  Coupon saved {currency} {quotedItem.couponDiscount}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="mt-4 flex w-fit items-center rounded-[var(--radius-md)] border border-[var(--border-soft)]">
                            <button
                              type="button"
                              onClick={() => {
                                if (quantity <= 1) return;
                                const index = cartItems.findIndex((item) => item.slug === slug);
                                if (index === -1) return;
                                const newCart = [...cartItems];
                                newCart.splice(index, 1);
                                saveCart(newCart);
                              }}
                              disabled={quantity <= 1 || quoteLoading}
                              className="flex h-9 w-9 items-center justify-center text-lg hover:text-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className="w-10 text-center text-sm">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => saveCart([...cartItems, storedItem])}
                              disabled={quoteLoading || !canIncrease}
                              className="flex h-9 w-9 items-center justify-center text-lg hover:text-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 text-right">
                          {quotedItem?.originalLineTotal &&
                            quotedItem.lineTotal &&
                            quotedItem.originalLineTotal !== quotedItem.lineTotal && (
                              <p className="text-xs text-[var(--text-muted)] line-through">
                                {currency} {quotedItem.originalLineTotal}
                              </p>
                            )}
                          <p className="font-medium text-[var(--color-copper)]">
                            {quotedItem?.lineTotal && quote ? `${currency} ${quotedItem.lineTotal}` : "—"}
                          </p>
                          <button
                            type="button"
                            onClick={() => saveCart(cartItems.filter((item) => item.slug !== slug))}
                            className="mt-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--color-copper)]"
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
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-olive)]">Secure summary</p>
              <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
                Prices, availability, discounts and shipping are verified by the server for your selected market.
              </p>

              <div className="mt-6 flex items-center justify-between border-b border-[var(--border-soft)] pb-5">
                <span className="text-sm text-[var(--text-secondary)]">Items</span>
                <span className="text-sm">{cartItems.length}</span>
              </div>

              <div className="mt-5 space-y-3 border-b border-[var(--border-soft)] pb-5 text-sm">
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
                    <span>Coupon</span>
                    <span>− {currency} {quote.couponDiscountTotal}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Merchandise subtotal</span>
                  <span>{quote ? `${currency} ${quote.merchandiseSubtotal}` : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Shipping</span>
                  <span className={quote?.shippingStatus === "free_shipping" ? "text-[var(--color-olive)]" : undefined}>
                    {quote?.shippingStatus === "configuration_missing"
                      ? "Unavailable"
                      : quote?.shippingStatus === "free_shipping"
                        ? "Free"
                        : quote?.shippingFee
                          ? `${currency} ${quote.shippingFee}`
                          : "—"}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="cart-coupon" className="text-sm font-medium text-[var(--color-espresso)]">
                  Coupon code
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="cart-coupon"
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        applyCoupon();
                      }
                    }}
                    disabled={quoteLoading}
                    placeholder="Enter code"
                    className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-copper)] disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={quoteLoading || couponInput.trim().length === 0}
                    className="rounded-[var(--radius-md)] border border-[var(--color-espresso)] px-4 py-2 text-sm font-medium text-[var(--color-espresso)] transition hover:bg-[var(--color-espresso)] hover:text-[var(--color-ivory)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>

                {appliedCouponCode && !quoteLoading && quote && quote.couponStatus !== "not_requested" && (
                  <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--surface)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-[var(--color-espresso)]">{quote.couponCode ?? appliedCouponCode}</p>
                        <p className={`mt-1 text-xs leading-5 ${quote.couponStatus === "applied" ? "text-[var(--color-olive)]" : "text-[var(--text-secondary)]"}`}>
                          {couponStatusMessage(quote.couponStatus)}
                        </p>
                      </div>
                      <button type="button" onClick={removeCoupon} className="text-xs text-[var(--color-copper)] hover:underline">
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {quote?.shippingStatus === "flat_rate" && quote.freeShippingThreshold && (
                <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
                  Free shipping starts at {currency} {quote.freeShippingThreshold} after promotions and coupons.
                </p>
              )}

              {quote?.shippingStatus === "free_shipping" && quote.freeShippingThreshold && (
                <p className="mt-4 text-xs leading-5 text-[var(--color-olive)]">
                  Free shipping applied. Your merchandise subtotal reached {currency} {quote.freeShippingThreshold}.
                </p>
              )}

              {quote?.shippingStatus === "configuration_missing" && (
                <p className="mt-4 text-xs leading-5 text-[var(--color-terracotta)]">
                  Shipping is not configured for the selected market yet.
                </p>
              )}

              <div className="mt-6 flex items-center justify-between">
                <span className="font-medium text-[var(--color-espresso)]">Total</span>
                <span className="text-xl font-medium text-[var(--color-copper)]">
                  {quoteLoading
                    ? "Checking…"
                    : quote?.finalTotal
                      ? `${currency} ${quote.finalTotal}`
                      : "—"}
                </span>
              </div>

              {quoteError && (
                <p className="mt-5 text-sm leading-6 text-[var(--color-terracotta)]">{quoteError}</p>
              )}

              {quote?.canCheckout && quote.finalTotal ? (
                <Link
                  href="/checkout"
                  onClick={prepareCheckout}
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

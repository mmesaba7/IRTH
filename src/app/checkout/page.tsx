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

type CheckoutCustomer = {
  recipientName: string;
  email: string;
  phone: string;
  countryCode: string;
  administrativeArea: string;
  city: string;
  addressLine1: string;
  deliveryNotes: string;
};

type FieldErrors = Partial<Record<keyof CheckoutCustomer, string>>;

type MarketCountry = {
  slug: string;
  name_ar: string | null;
  name_en: string;
  iso_code: string;
};

type CheckoutContext = {
  authenticated: boolean;
  customer: null | {
    recipientName: string;
    email: string;
  };
  market: null | {
    id: string;
    slug: string;
    currencyCode: string;
    country: MarketCountry;
  };
};

const EMPTY_CART = "[]";
const CHECKOUT_COUPON_KEY = "irth-checkout-coupon";

const EGYPT_GOVERNORATES = [
  "Alexandria",
  "Aswan",
  "Asyut",
  "Beheira",
  "Beni Suef",
  "Cairo",
  "Dakahlia",
  "Damietta",
  "Faiyum",
  "Gharbia",
  "Giza",
  "Ismailia",
  "Kafr El Sheikh",
  "Luxor",
  "Matrouh",
  "Minya",
  "Monufia",
  "New Valley",
  "North Sinai",
  "Port Said",
  "Qalyubia",
  "Qena",
  "Red Sea",
  "Sharqia",
  "Sohag",
  "South Sinai",
  "Suez",
];

const EMPTY_CUSTOMER: CheckoutCustomer = {
  recipientName: "",
  email: "",
  phone: "",
  countryCode: "",
  administrativeArea: "",
  city: "",
  addressLine1: "",
  deliveryNotes: "",
};

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

function inputClass(hasError = false) {
  return `mt-2 w-full rounded-[var(--radius-md)] border bg-[var(--surface)] px-4 py-3 text-[var(--color-espresso)] outline-none transition ${
    hasError
      ? "border-[var(--color-terracotta)]"
      : "border-[var(--border-soft)] focus:border-[var(--color-copper)]"
  }`;
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
  const [checkoutContext, setCheckoutContext] = useState<CheckoutContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState("");
  const [customer, setCustomer] = useState<CheckoutCustomer>(EMPTY_CUSTOMER);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [validationError, setValidationError] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    setCouponCode(sessionStorage.getItem(CHECKOUT_COUPON_KEY));
    setCouponReady(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/checkout/validate", {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as CheckoutContext & { error?: string };
        if (controller.signal.aborted) return;

        if (!response.ok) {
          setContextError(payload.error ?? "Unable to load checkout details.");
          return;
        }

        setCheckoutContext(payload);
        setCustomer((current) => ({
          ...current,
          recipientName: payload.customer?.recipientName ?? current.recipientName,
          email: payload.customer?.email ?? current.email,
          countryCode: payload.market?.country.iso_code ?? "",
        }));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Could not load checkout context:", error);
        setContextError("Unable to load checkout details.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setContextLoading(false);
      });

    return () => controller.abort();
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
  const marketCountry = checkoutContext?.market?.country ?? null;

  const updateCustomer = (field: keyof CheckoutCustomer, value: string) => {
    setCustomer((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setValidationError("");
    setValidationMessage("");
  };

  const validateDetails = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (quoteLoading || !quote?.canCheckout || contextLoading || !marketCountry) return;

    setValidating(true);
    setFieldErrors({});
    setValidationError("");
    setValidationMessage("");

    try {
      const response = await fetch("/api/checkout/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          items: quoteItems,
          couponCode,
          customer: {
            ...customer,
            countryCode: marketCountry.iso_code,
          },
        }),
      });

      const payload = (await response.json()) as {
        valid?: boolean;
        fieldErrors?: FieldErrors;
        error?: string;
        orderCreated?: boolean;
      };

      if (!response.ok || !payload.valid) {
        if (payload.fieldErrors) setFieldErrors(payload.fieldErrors);
        setValidationError(
          payload.error ??
            (response.status === 422
              ? "Please correct the highlighted checkout details."
              : "Checkout details could not be validated.")
        );
        return;
      }

      setValidationMessage(
        payload.orderCreated === false
          ? "Details validated securely. No order has been created yet."
          : "Details validated securely."
      );
    } catch (error) {
      console.error("Could not validate checkout details:", error);
      setValidationError("Checkout details could not be validated.");
    } finally {
      setValidating(false);
    }
  };

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
          Complete your details
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Your cart is revalidated by the server. Customer contact and delivery details stay out of browser storage and no order is created in this step.
        </p>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="space-y-7">
            <form
              id="checkout-customer-form"
              onSubmit={validateDetails}
              className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-7"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-olive)]">
                    Contact & delivery
                  </p>
                  <h2 className="mt-3 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                    Where should we deliver?
                  </h2>
                </div>

                {!contextLoading && checkoutContext && !checkoutContext.authenticated && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Guest checkout ·{" "}
                    <button
                      type="button"
                      onClick={() => window.location.assign("/account/login?returnTo=%2Fcheckout")}
                      className="cursor-pointer bg-transparent p-0 font-medium text-[var(--color-copper)] hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                )}

                {!contextLoading && checkoutContext?.authenticated && (
                  <p className="text-sm text-[var(--color-olive)]">Signed in</p>
                )}
              </div>

              {contextLoading && (
                <p className="mt-5 text-sm text-[var(--text-secondary)]">
                  Loading checkout context…
                </p>
              )}

              {contextError && (
                <p className="mt-5 text-sm text-[var(--color-terracotta)]">{contextError}</p>
              )}

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <label className="text-sm text-[var(--text-secondary)] sm:col-span-2">
                  Recipient full name *
                  <input
                    type="text"
                    autoComplete="name"
                    value={customer.recipientName}
                    onChange={(event) => updateCustomer("recipientName", event.target.value)}
                    className={inputClass(Boolean(fieldErrors.recipientName))}
                  />
                  {fieldErrors.recipientName && (
                    <span className="mt-1 block text-xs text-[var(--color-terracotta)]">
                      {fieldErrors.recipientName}
                    </span>
                  )}
                </label>

                <label className="text-sm text-[var(--text-secondary)]">
                  Email *
                  <input
                    type="email"
                    autoComplete="email"
                    value={customer.email}
                    onChange={(event) => updateCustomer("email", event.target.value)}
                    className={inputClass(Boolean(fieldErrors.email))}
                  />
                  {fieldErrors.email && (
                    <span className="mt-1 block text-xs text-[var(--color-terracotta)]">
                      {fieldErrors.email}
                    </span>
                  )}
                </label>

                <label className="text-sm text-[var(--text-secondary)]">
                  Phone *
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={customer.phone}
                    onChange={(event) => updateCustomer("phone", event.target.value)}
                    className={inputClass(Boolean(fieldErrors.phone))}
                  />
                  {fieldErrors.phone && (
                    <span className="mt-1 block text-xs text-[var(--color-terracotta)]">
                      {fieldErrors.phone}
                    </span>
                  )}
                </label>

                <div className="text-sm text-[var(--text-secondary)]">
                  Delivery country
                  <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-[var(--color-espresso)]">
                    {marketCountry
                      ? `${marketCountry.name_en} (${marketCountry.iso_code})`
                      : "Selected Market country"}
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Delivery country follows the selected Market. Change Market to deliver to another country.
                  </p>
                  {fieldErrors.countryCode && (
                    <span className="mt-1 block text-xs text-[var(--color-terracotta)]">
                      {fieldErrors.countryCode}
                    </span>
                  )}
                </div>

                <label className="text-sm text-[var(--text-secondary)]">
                  {marketCountry?.iso_code === "EG" ? "Governorate *" : "Administrative area *"}
                  {marketCountry?.iso_code === "EG" ? (
                    <select
                      value={customer.administrativeArea}
                      onChange={(event) => updateCustomer("administrativeArea", event.target.value)}
                      className={inputClass(Boolean(fieldErrors.administrativeArea))}
                    >
                      <option value="">Select governorate</option>
                      {EGYPT_GOVERNORATES.map((governorate) => (
                        <option key={governorate} value={governorate}>
                          {governorate}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={customer.administrativeArea}
                      onChange={(event) => updateCustomer("administrativeArea", event.target.value)}
                      className={inputClass(Boolean(fieldErrors.administrativeArea))}
                    />
                  )}
                  {fieldErrors.administrativeArea && (
                    <span className="mt-1 block text-xs text-[var(--color-terracotta)]">
                      {fieldErrors.administrativeArea}
                    </span>
                  )}
                </label>

                <label className="text-sm text-[var(--text-secondary)]">
                  City *
                  <input
                    type="text"
                    autoComplete="address-level2"
                    value={customer.city}
                    onChange={(event) => updateCustomer("city", event.target.value)}
                    className={inputClass(Boolean(fieldErrors.city))}
                  />
                  {fieldErrors.city && (
                    <span className="mt-1 block text-xs text-[var(--color-terracotta)]">
                      {fieldErrors.city}
                    </span>
                  )}
                </label>

                <label className="text-sm text-[var(--text-secondary)] sm:col-span-2">
                  Detailed address *
                  <input
                    type="text"
                    autoComplete="street-address"
                    value={customer.addressLine1}
                    onChange={(event) => updateCustomer("addressLine1", event.target.value)}
                    className={inputClass(Boolean(fieldErrors.addressLine1))}
                  />
                  {fieldErrors.addressLine1 && (
                    <span className="mt-1 block text-xs text-[var(--color-terracotta)]">
                      {fieldErrors.addressLine1}
                    </span>
                  )}
                </label>

                <label className="text-sm text-[var(--text-secondary)] sm:col-span-2">
                  Delivery notes (optional)
                  <textarea
                    value={customer.deliveryNotes}
                    onChange={(event) => updateCustomer("deliveryNotes", event.target.value)}
                    rows={3}
                    maxLength={500}
                    className={inputClass(Boolean(fieldErrors.deliveryNotes))}
                  />
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    Delivery notes stay private to IRTH/shipping operations and are not intended for Artisan contact.
                  </span>
                  {fieldErrors.deliveryNotes && (
                    <span className="mt-1 block text-xs text-[var(--color-terracotta)]">
                      {fieldErrors.deliveryNotes}
                    </span>
                  )}
                </label>
              </div>

              <button
                type="submit"
                disabled={
                  validating ||
                  quoteLoading ||
                  !quote?.canCheckout ||
                  contextLoading ||
                  !marketCountry
                }
                className="mt-7 w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {validating ? "Validating securely…" : "Validate checkout details"}
              </button>

              {validationError && (
                <p className="mt-4 text-sm text-[var(--color-terracotta)]">{validationError}</p>
              )}
              {validationMessage && (
                <p className="mt-4 text-sm text-[var(--color-olive)]">{validationMessage}</p>
              )}
            </form>

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
              Continue — shipping comes next
            </button>
            <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
              Shipping pricing, order creation and payment are intentionally not active yet.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}

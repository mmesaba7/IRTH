"use client";

import { useEffect, useMemo, useState } from "react";

export type ProductQuoteStatus =
  | "available"
  | "product_unavailable"
  | "not_priced_for_market"
  | "out_of_stock"
  | "insufficient_stock";

export type ProductQuoteItem = {
  slug: string;
  requestedQuantity: number;
  status: ProductQuoteStatus;
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

export type ProductQuote = {
  market: {
    id: string;
    slug: string;
    currency_code: string;
  };
  items: ProductQuoteItem[];
  subtotal: string;
  canCheckout: boolean;
};

type QuoteState = {
  requestKey: string;
  quote: ProductQuote | null;
  marketRequired: boolean;
  error: string;
};

export function useProductQuote(slug: string, quantity = 1) {
  const requestKey = useMemo(
    () => JSON.stringify({ slug: slug.trim(), quantity }),
    [quantity, slug]
  );
  const [state, setState] = useState<QuoteState>({
    requestKey: "",
    quote: null,
    marketRequired: false,
    error: "",
  });

  useEffect(() => {
    if (!slug.trim() || !Number.isSafeInteger(quantity) || quantity <= 0) {
      return;
    }

    const controller = new AbortController();

    fetch("/api/cart/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        items: [{ slug: slug.trim(), quantity }],
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          quote?: ProductQuote;
          error?: string;
        };

        if (response.status === 409) {
          setState({
            requestKey,
            quote: null,
            marketRequired: true,
            error: "",
          });
          return;
        }

        if (!response.ok || !payload.quote) {
          throw new Error(payload.error || "Could not load product price.");
        }

        setState({
          requestKey,
          quote: payload.quote,
          marketRequired: false,
          error: "",
        });
      })
      .catch((quoteError: unknown) => {
        if (controller.signal.aborted) return;

        setState({
          requestKey,
          quote: null,
          marketRequired: false,
          error:
            quoteError instanceof Error
              ? quoteError.message
              : "Could not load product price.",
        });
      });

    return () => controller.abort();
  }, [quantity, requestKey, slug]);

  const isCurrent = state.requestKey === requestKey;
  const quote = isCurrent ? state.quote : null;
  const item = quote?.items[0] ?? null;

  return {
    quote,
    item,
    loading: !isCurrent,
    marketRequired: isCurrent && state.marketRequired,
    error: isCurrent ? state.error : "",
  };
}

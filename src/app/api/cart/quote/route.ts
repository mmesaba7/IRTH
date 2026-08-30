import { NextRequest, NextResponse } from "next/server";
import { quoteCart, type CartQuoteInputItem } from "@/lib/cartQuote";
import { applyPromotionsToQuote } from "@/lib/promotionQuote";
import { applyCouponToQuote } from "@/lib/couponQuote";
import {
  applyShippingToQuote,
  type ShippingCartQuote,
} from "@/lib/shippingQuote";

function parseItems(body: unknown): CartQuoteInputItem[] | null {
  if (typeof body !== "object" || body === null || !("items" in body)) {
    return null;
  }

  const rawItems = (body as { items?: unknown }).items;

  if (!Array.isArray(rawItems)) {
    return null;
  }

  const items: CartQuoteInputItem[] = [];

  for (const rawItem of rawItems) {
    if (typeof rawItem !== "object" || rawItem === null) {
      return null;
    }

    const slug = "slug" in rawItem ? (rawItem as { slug?: unknown }).slug : null;
    const quantity =
      "quantity" in rawItem ? (rawItem as { quantity?: unknown }).quantity : null;

    if (
      typeof slug !== "string" ||
      slug.trim().length === 0 ||
      typeof quantity !== "number" ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    ) {
      return null;
    }

    items.push({ slug: slug.trim(), quantity });
  }

  return items;
}

function parseCouponCode(body: unknown) {
  if (typeof body !== "object" || body === null || !("couponCode" in body)) {
    return { valid: true, value: null } as const;
  }

  const rawCouponCode = (body as { couponCode?: unknown }).couponCode;

  if (rawCouponCode === null || rawCouponCode === undefined) {
    return { valid: true, value: null } as const;
  }

  if (typeof rawCouponCode !== "string") {
    return { valid: false, value: null } as const;
  }

  const normalized = rawCouponCode.trim();

  return {
    valid: true,
    value: normalized.length > 0 ? normalized : null,
  } as const;
}

function publicQuoteResponse(quote: ShippingCartQuote) {
  return {
    market: quote.market,
    items: quote.items.map((item) => ({
      slug: item.slug,
      requestedQuantity: item.requestedQuantity,
      status: item.status,
      product: item.product,
      unitPrice: item.unitPrice,
      originalLineTotal: item.originalLineTotal,
      promotionDiscount: item.promotionDiscount,
      couponDiscount: item.couponDiscount,
      lineTotal: item.lineTotal,
    })),
    subtotalBeforePromotions: quote.subtotalBeforePromotions,
    promotionDiscountTotal: quote.promotionDiscountTotal,
    subtotalBeforeCoupon: quote.subtotalBeforeCoupon,
    couponDiscountTotal: quote.couponDiscountTotal,
    couponCode: quote.couponCode,
    couponStatus: quote.couponStatus,
    subtotal: quote.subtotal,
    merchandiseSubtotal: quote.merchandiseSubtotal,
    shippingFee: quote.shippingFee,
    freeShippingThreshold: quote.freeShippingThreshold,
    shippingStatus: quote.shippingStatus,
    finalTotal: quote.finalTotal,
    canCheckout: quote.canCheckout,
  };
}

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: "Invalid request body" }, 400);
  }

  const items = parseItems(body);
  const couponCode = parseCouponCode(body);

  if (!items) {
    return jsonNoStore(
      { error: "items must contain valid slug and quantity values" },
      400
    );
  }

  if (!couponCode.valid) {
    return jsonNoStore(
      { error: "couponCode must be a string when provided" },
      400
    );
  }

  try {
    const baseQuote = await quoteCart(items);

    if (!baseQuote) {
      return jsonNoStore(
        { error: "A market must be selected before quoting the cart" },
        409
      );
    }

    const promotionQuote = await applyPromotionsToQuote(baseQuote);
    const couponQuote = await applyCouponToQuote(
      promotionQuote,
      couponCode.value
    );
    const quote = await applyShippingToQuote(couponQuote);

    return jsonNoStore({ quote: publicQuoteResponse(quote) });
  } catch (error) {
    console.error("Unable to quote cart:", error);

    return jsonNoStore({ error: "Unable to quote cart" }, 500);
  }
}

import "server-only";

import type { CartQuote, CartQuoteItem } from "@/lib/cartQuote";
import { createClient } from "@/lib/supabase/server";

type PromotionSource = "irth" | "artisan";
type PromotionDiscountType = "percentage" | "fixed";

type ActivePromotionRow = {
  promotion_id: string;
  market_id: string;
  source_type: PromotionSource;
  discount_type: PromotionDiscountType;
  discount_value: number | string;
  product_id: string;
};

type Decimal = {
  digits: string;
  scale: number;
};

export type AppliedPromotion = {
  id: string;
  sourceType: PromotionSource;
  discountType: PromotionDiscountType;
  discountValue: string;
  fundingSource: PromotionSource;
};

export type PromotionFunding = {
  irth: string;
  artisan: string;
};

export type PromotionQuoteItem = CartQuoteItem & {
  originalLineTotal: string | null;
  promotion: AppliedPromotion | null;
  promotionDiscount: string | null;
  promotionFunding: PromotionFunding | null;
};

export type PromotionCartQuote = Omit<CartQuote, "items" | "subtotal"> & {
  items: PromotionQuoteItem[];
  subtotalBeforePromotions: string;
  promotionDiscountTotal: string;
  subtotal: string;
  promotionFunding: PromotionFunding;
};

function parseDecimal(value: string): Decimal {
  const normalized = value.trim();

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error("Invalid non-negative decimal value");
  }

  const [whole, fraction = ""] = normalized.split(".");
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, "");

  return {
    digits: digits || "0",
    scale: fraction.length,
  };
}

function pow10(scale: number) {
  return BigInt(10) ** BigInt(scale);
}

function roundHalfUp(numerator: bigint, denominator: bigint) {
  if (denominator <= BigInt(0)) {
    throw new Error("Invalid rounding denominator");
  }

  const quotient = numerator / denominator;
  const remainder = numerator % denominator;

  return remainder * BigInt(2) >= denominator
    ? quotient + BigInt(1)
    : quotient;
}

function decimalToMinorUnits(value: string, currencyScale: number) {
  const decimal = parseDecimal(value);
  const digits = BigInt(decimal.digits);

  if (decimal.scale <= currencyScale) {
    return digits * pow10(currencyScale - decimal.scale);
  }

  return roundHalfUp(digits, pow10(decimal.scale - currencyScale));
}

function formatMinorUnits(value: bigint, currencyScale: number) {
  if (value < BigInt(0)) {
    throw new Error("Negative money value is not allowed");
  }

  const digits = value.toString();

  if (currencyScale === 0) {
    return digits;
  }

  const padded = digits.padStart(currencyScale + 1, "0");
  const whole = padded.slice(0, -currencyScale);
  const fraction = padded.slice(-currencyScale);

  return `${whole}.${fraction}`;
}

function getCurrencyMinorUnitScale(currencyCode: string) {
  const options = new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
  }).resolvedOptions();

  const scale = options.maximumFractionDigits;

  if (!Number.isSafeInteger(scale) || scale < 0 || scale > 6) {
    throw new Error(`Unsupported currency minor-unit scale: ${currencyCode}`);
  }

  return scale;
}

function percentageDiscountMinorUnits(
  lineTotalMinor: bigint,
  percentageValue: string
) {
  const percentage = parseDecimal(percentageValue);
  const numerator = lineTotalMinor * BigInt(percentage.digits);
  const denominator = BigInt(100) * pow10(percentage.scale);
  const discount = roundHalfUp(numerator, denominator);

  return discount > lineTotalMinor ? lineTotalMinor : discount;
}

function fixedDiscountMinorUnits(
  unitPriceMinor: bigint,
  quantity: number,
  discountValue: string,
  currencyScale: number
) {
  const perUnitDiscount = decimalToMinorUnits(discountValue, currencyScale);
  const cappedPerUnitDiscount =
    perUnitDiscount > unitPriceMinor ? unitPriceMinor : perUnitDiscount;

  return cappedPerUnitDiscount * BigInt(quantity);
}

function calculatePromotionDiscount(
  promotion: ActivePromotionRow,
  unitPriceMinor: bigint,
  lineTotalMinor: bigint,
  quantity: number,
  currencyScale: number
) {
  const discountValue = String(promotion.discount_value);

  return promotion.discount_type === "percentage"
    ? percentageDiscountMinorUnits(lineTotalMinor, discountValue)
    : fixedDiscountMinorUnits(
        unitPriceMinor,
        quantity,
        discountValue,
        currencyScale
      );
}

function chooseBestPromotion(
  promotions: ActivePromotionRow[],
  unitPriceMinor: bigint,
  lineTotalMinor: bigint,
  quantity: number,
  currencyScale: number
) {
  let best: { promotion: ActivePromotionRow; discountMinor: bigint } | null = null;

  for (const promotion of promotions) {
    const discountMinor = calculatePromotionDiscount(
      promotion,
      unitPriceMinor,
      lineTotalMinor,
      quantity,
      currencyScale
    );

    if (!best || discountMinor > best.discountMinor) {
      best = { promotion, discountMinor };
      continue;
    }

    if (discountMinor !== best.discountMinor) {
      continue;
    }

    if (
      promotion.source_type === "artisan" &&
      best.promotion.source_type !== "artisan"
    ) {
      best = { promotion, discountMinor };
      continue;
    }

    if (
      promotion.source_type === best.promotion.source_type &&
      promotion.promotion_id < best.promotion.promotion_id
    ) {
      best = { promotion, discountMinor };
    }
  }

  return best;
}

function emptyFunding(currencyScale: number): PromotionFunding {
  const zero = formatMinorUnits(BigInt(0), currencyScale);

  return { irth: zero, artisan: zero };
}

export async function applyPromotionsToQuote(
  quote: CartQuote
): Promise<PromotionCartQuote> {
  const currencyScale = getCurrencyMinorUnitScale(quote.market.currency_code);
  const productIds = quote.items.flatMap((item) =>
    item.status === "available" && item.product ? [item.product.id] : []
  );

  let activePromotions: ActivePromotionRow[] = [];

  if (productIds.length > 0) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .rpc("get_active_promotions", {
        p_market_id: quote.market.id,
      })
      .in("product_id", productIds);

    if (error) {
      throw error;
    }

    activePromotions = (data ?? []) as ActivePromotionRow[];
  }

  const promotionsByProduct = new Map<string, ActivePromotionRow[]>();

  for (const promotion of activePromotions) {
    const current = promotionsByProduct.get(promotion.product_id) ?? [];
    current.push(promotion);
    promotionsByProduct.set(promotion.product_id, current);
  }

  let subtotalBeforeMinor = BigInt(0);
  let promotionDiscountMinor = BigInt(0);
  let subtotalMinor = BigInt(0);
  let irthFundingMinor = BigInt(0);
  let artisanFundingMinor = BigInt(0);

  const items: PromotionQuoteItem[] = quote.items.map((item) => {
    if (
      item.status !== "available" ||
      !item.product ||
      !item.unitPrice ||
      !item.lineTotal
    ) {
      return {
        ...item,
        originalLineTotal: null,
        promotion: null,
        promotionDiscount: null,
        promotionFunding: null,
      };
    }

    const unitPriceMinor = decimalToMinorUnits(item.unitPrice, currencyScale);

    if (unitPriceMinor <= BigInt(0)) {
      throw new Error("Market price rounds below the currency minor unit");
    }

    const originalLineTotalMinor =
      unitPriceMinor * BigInt(item.requestedQuantity);
    const best = chooseBestPromotion(
      promotionsByProduct.get(item.product.id) ?? [],
      unitPriceMinor,
      originalLineTotalMinor,
      item.requestedQuantity,
      currencyScale
    );
    const itemDiscountMinor = best?.discountMinor ?? BigInt(0);
    const discountedLineTotalMinor = originalLineTotalMinor - itemDiscountMinor;
    const funding = emptyFunding(currencyScale);

    if (best?.promotion.source_type === "irth") {
      funding.irth = formatMinorUnits(itemDiscountMinor, currencyScale);
      irthFundingMinor += itemDiscountMinor;
    } else if (best?.promotion.source_type === "artisan") {
      funding.artisan = formatMinorUnits(itemDiscountMinor, currencyScale);
      artisanFundingMinor += itemDiscountMinor;
    }

    subtotalBeforeMinor += originalLineTotalMinor;
    promotionDiscountMinor += itemDiscountMinor;
    subtotalMinor += discountedLineTotalMinor;

    return {
      ...item,
      unitPrice: formatMinorUnits(unitPriceMinor, currencyScale),
      originalLineTotal: formatMinorUnits(
        originalLineTotalMinor,
        currencyScale
      ),
      lineTotal: formatMinorUnits(discountedLineTotalMinor, currencyScale),
      promotion: best
        ? {
            id: best.promotion.promotion_id,
            sourceType: best.promotion.source_type,
            discountType: best.promotion.discount_type,
            discountValue: String(best.promotion.discount_value),
            fundingSource: best.promotion.source_type,
          }
        : null,
      promotionDiscount: formatMinorUnits(itemDiscountMinor, currencyScale),
      promotionFunding: funding,
    };
  });

  return {
    ...quote,
    items,
    subtotalBeforePromotions: formatMinorUnits(
      subtotalBeforeMinor,
      currencyScale
    ),
    promotionDiscountTotal: formatMinorUnits(
      promotionDiscountMinor,
      currencyScale
    ),
    subtotal: formatMinorUnits(subtotalMinor, currencyScale),
    promotionFunding: {
      irth: formatMinorUnits(irthFundingMinor, currencyScale),
      artisan: formatMinorUnits(artisanFundingMinor, currencyScale),
    },
    canCheckout: quote.canCheckout,
  };
}

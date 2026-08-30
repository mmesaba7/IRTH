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

type PromotionCandidate = {
  promotion: ActivePromotionRow;
  discountMinor: string;
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

function trimLeadingZeros(value: string) {
  return value.replace(/^0+(?=\d)/, "") || "0";
}

function parseDecimal(value: string): Decimal {
  const normalized = value.trim();

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error("Invalid non-negative decimal value");
  }

  const [whole, fraction = ""] = normalized.split(".");

  return {
    digits: trimLeadingZeros(`${whole}${fraction}`),
    scale: fraction.length,
  };
}

function compareIntegerStrings(left: string, right: string) {
  const normalizedLeft = trimLeadingZeros(left);
  const normalizedRight = trimLeadingZeros(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length > normalizedRight.length ? 1 : -1;
  }

  if (normalizedLeft === normalizedRight) {
    return 0;
  }

  return normalizedLeft > normalizedRight ? 1 : -1;
}

function addIntegerStrings(left: string, right: string) {
  let leftIndex = left.length - 1;
  let rightIndex = right.length - 1;
  let carry = 0;
  let result = "";

  while (leftIndex >= 0 || rightIndex >= 0 || carry > 0) {
    const leftDigit = leftIndex >= 0 ? Number(left[leftIndex]) : 0;
    const rightDigit = rightIndex >= 0 ? Number(right[rightIndex]) : 0;
    const sum = leftDigit + rightDigit + carry;

    result = `${sum % 10}${result}`;
    carry = Math.floor(sum / 10);
    leftIndex -= 1;
    rightIndex -= 1;
  }

  return trimLeadingZeros(result);
}

function subtractIntegerStrings(left: string, right: string) {
  if (compareIntegerStrings(left, right) < 0) {
    throw new Error("Negative integer subtraction is not allowed");
  }

  let leftIndex = left.length - 1;
  let rightIndex = right.length - 1;
  let borrow = 0;
  let result = "";

  while (leftIndex >= 0) {
    let digit = Number(left[leftIndex]) - borrow;
    const rightDigit = rightIndex >= 0 ? Number(right[rightIndex]) : 0;

    if (digit < rightDigit) {
      digit += 10;
      borrow = 1;
    } else {
      borrow = 0;
    }

    result = `${digit - rightDigit}${result}`;
    leftIndex -= 1;
    rightIndex -= 1;
  }

  return trimLeadingZeros(result);
}

function multiplyIntegerByDigit(value: string, digit: number) {
  if (digit === 0 || value === "0") {
    return "0";
  }

  let carry = 0;
  let result = "";

  for (let index = value.length - 1; index >= 0; index -= 1) {
    const product = Number(value[index]) * digit + carry;
    result = `${product % 10}${result}`;
    carry = Math.floor(product / 10);
  }

  if (carry > 0) {
    result = `${carry}${result}`;
  }

  return trimLeadingZeros(result);
}

function multiplyIntegerStrings(left: string, right: string) {
  let result = "0";
  let zeroPadding = "";

  for (let index = right.length - 1; index >= 0; index -= 1) {
    const digit = Number(right[index]);
    const partial = `${multiplyIntegerByDigit(left, digit)}${zeroPadding}`;
    result = addIntegerStrings(result, partial);
    zeroPadding += "0";
  }

  return trimLeadingZeros(result);
}

function roundByPowerOfTenHalfUp(digits: string, placesToRemove: number) {
  if (placesToRemove <= 0) {
    return `${trimLeadingZeros(digits)}${"0".repeat(-placesToRemove)}`;
  }

  const padded = trimLeadingZeros(digits).padStart(placesToRemove + 1, "0");
  const splitIndex = padded.length - placesToRemove;
  const kept = trimLeadingZeros(padded.slice(0, splitIndex));
  const firstRemovedDigit = Number(padded[splitIndex] ?? "0");

  return firstRemovedDigit >= 5 ? addIntegerStrings(kept, "1") : kept;
}

function decimalToMinorUnits(value: string, currencyScale: number) {
  const decimal = parseDecimal(value);

  if (decimal.scale <= currencyScale) {
    return `${decimal.digits}${"0".repeat(currencyScale - decimal.scale)}`;
  }

  return roundByPowerOfTenHalfUp(
    decimal.digits,
    decimal.scale - currencyScale
  );
}

function formatMinorUnits(value: string, currencyScale: number) {
  const digits = trimLeadingZeros(value);

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

  if (
    typeof scale !== "number" ||
    !Number.isSafeInteger(scale) ||
    scale < 0 ||
    scale > 6
  ) {
    throw new Error(`Unsupported currency minor-unit scale: ${currencyCode}`);
  }

  return scale;
}

function percentageDiscountMinorUnits(
  lineTotalMinor: string,
  percentageValue: string
) {
  const percentage = parseDecimal(percentageValue);
  const numerator = multiplyIntegerStrings(
    lineTotalMinor,
    percentage.digits
  );
  const discount = roundByPowerOfTenHalfUp(
    numerator,
    percentage.scale + 2
  );

  return compareIntegerStrings(discount, lineTotalMinor) > 0
    ? lineTotalMinor
    : discount;
}

function fixedDiscountMinorUnits(
  unitPriceMinor: string,
  quantity: number,
  discountValue: string,
  currencyScale: number
) {
  const perUnitDiscount = decimalToMinorUnits(discountValue, currencyScale);
  const cappedPerUnitDiscount =
    compareIntegerStrings(perUnitDiscount, unitPriceMinor) > 0
      ? unitPriceMinor
      : perUnitDiscount;

  return multiplyIntegerStrings(cappedPerUnitDiscount, String(quantity));
}

function calculatePromotionDiscount(
  promotion: ActivePromotionRow,
  unitPriceMinor: string,
  lineTotalMinor: string,
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
  unitPriceMinor: string,
  lineTotalMinor: string,
  quantity: number,
  currencyScale: number
) {
  let best: PromotionCandidate | null = null;

  for (const promotion of promotions) {
    const discountMinor = calculatePromotionDiscount(
      promotion,
      unitPriceMinor,
      lineTotalMinor,
      quantity,
      currencyScale
    );
    const comparison = best
      ? compareIntegerStrings(discountMinor, best.discountMinor)
      : 1;

    if (!best || comparison > 0) {
      best = { promotion, discountMinor };
      continue;
    }

    if (comparison < 0) {
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
  const zero = formatMinorUnits("0", currencyScale);

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

  let subtotalBeforeMinor = "0";
  let promotionDiscountMinor = "0";
  let subtotalMinor = "0";
  let irthFundingMinor = "0";
  let artisanFundingMinor = "0";

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

    if (compareIntegerStrings(unitPriceMinor, "0") <= 0) {
      throw new Error("Market price rounds below the currency minor unit");
    }

    const originalLineTotalMinor = multiplyIntegerStrings(
      unitPriceMinor,
      String(item.requestedQuantity)
    );
    const best = chooseBestPromotion(
      promotionsByProduct.get(item.product.id) ?? [],
      unitPriceMinor,
      originalLineTotalMinor,
      item.requestedQuantity,
      currencyScale
    );
    const itemDiscountMinor = best?.discountMinor ?? "0";
    const discountedLineTotalMinor = subtractIntegerStrings(
      originalLineTotalMinor,
      itemDiscountMinor
    );
    const funding = emptyFunding(currencyScale);

    if (best?.promotion.source_type === "irth") {
      funding.irth = formatMinorUnits(itemDiscountMinor, currencyScale);
      irthFundingMinor = addIntegerStrings(irthFundingMinor, itemDiscountMinor);
    } else if (best?.promotion.source_type === "artisan") {
      funding.artisan = formatMinorUnits(itemDiscountMinor, currencyScale);
      artisanFundingMinor = addIntegerStrings(
        artisanFundingMinor,
        itemDiscountMinor
      );
    }

    subtotalBeforeMinor = addIntegerStrings(
      subtotalBeforeMinor,
      originalLineTotalMinor
    );
    promotionDiscountMinor = addIntegerStrings(
      promotionDiscountMinor,
      itemDiscountMinor
    );
    subtotalMinor = addIntegerStrings(subtotalMinor, discountedLineTotalMinor);

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

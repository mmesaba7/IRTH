import "server-only";

import type {
  PromotionCartQuote,
  PromotionFunding,
  PromotionQuoteItem,
} from "@/lib/promotionQuote";
import { createClient } from "@/lib/supabase/server";

type CouponDiscountType = "percentage" | "fixed";
type CouponFundingSource = "irth" | "artisan";

type ApplicableCouponRow = {
  coupon_id: string;
  market_id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: string;
  minimum_order_amount: string | null;
  max_discount_amount: string | null;
  stackable: boolean;
  funding_source: CouponFundingSource;
  eligible_product_ids: string[];
};

type Decimal = {
  digits: string;
  scale: number;
};

type CouponAllocationLine = {
  itemIndex: number;
  productId: string;
  weightMinor: string;
};

type CouponAllocation = CouponAllocationLine & {
  discountMinor: string;
  remainder: string;
};

export type CouponQuoteStatus =
  | "not_requested"
  | "applied"
  | "invalid_or_unavailable"
  | "not_applicable"
  | "minimum_not_met"
  | "promotion_preferred"
  | "no_discount";

export type AppliedCoupon = {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: string;
  stackable: boolean;
  fundingSource: CouponFundingSource;
};

export type CouponFunding = {
  irth: string;
  artisan: string;
};

export type CouponQuoteItem = PromotionQuoteItem & {
  couponEligible: boolean;
  couponDiscount: string | null;
  couponFunding: CouponFunding | null;
};

export type CouponCartQuote = Omit<
  PromotionCartQuote,
  "items" | "promotionDiscountTotal" | "promotionFunding" | "subtotal"
> & {
  items: CouponQuoteItem[];
  promotionDiscountTotal: string;
  promotionFunding: PromotionFunding;
  subtotalBeforeCoupon: string;
  couponEligibleSubtotal: string | null;
  couponDiscountTotal: string;
  couponFunding: CouponFunding;
  couponCode: string | null;
  couponStatus: CouponQuoteStatus;
  coupon: AppliedCoupon | null;
  subtotal: string;
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

function divideIntegerStrings(numerator: string, denominator: string) {
  const normalizedNumerator = trimLeadingZeros(numerator);
  const normalizedDenominator = trimLeadingZeros(denominator);

  if (normalizedDenominator === "0") {
    throw new Error("Division by zero is not allowed");
  }

  let quotient = "";
  let remainder = "0";

  for (const digit of normalizedNumerator) {
    remainder = trimLeadingZeros(`${remainder}${digit}`);
    let quotientDigit = 0;

    for (let candidate = 9; candidate >= 1; candidate -= 1) {
      const product = multiplyIntegerByDigit(normalizedDenominator, candidate);

      if (compareIntegerStrings(product, remainder) <= 0) {
        quotientDigit = candidate;
        remainder = subtractIntegerStrings(remainder, product);
        break;
      }
    }

    quotient += String(quotientDigit);
  }

  return {
    quotient: trimLeadingZeros(quotient),
    remainder: trimLeadingZeros(remainder),
  };
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

  if (!Number.isSafeInteger(scale) || scale < 0 || scale > 6) {
    throw new Error(`Unsupported currency minor-unit scale: ${currencyCode}`);
  }

  return scale;
}

function percentageDiscountMinorUnits(
  eligibleSubtotalMinor: string,
  percentageValue: string
) {
  const percentage = parseDecimal(percentageValue);
  const numerator = multiplyIntegerStrings(
    eligibleSubtotalMinor,
    percentage.digits
  );
  const discount = roundByPowerOfTenHalfUp(
    numerator,
    percentage.scale + 2
  );

  return compareIntegerStrings(discount, eligibleSubtotalMinor) > 0
    ? eligibleSubtotalMinor
    : discount;
}

function sumIntegerStrings(values: string[]) {
  return values.reduce(
    (total, value) => addIntegerStrings(total, value),
    "0"
  );
}

function emptyFunding(currencyScale: number): CouponFunding {
  const zero = formatMinorUnits("0", currencyScale);
  return { irth: zero, artisan: zero };
}

function fundingToMinor(
  funding: PromotionFunding | null,
  currencyScale: number
) {
  return {
    irth: decimalToMinorUnits(funding?.irth ?? "0", currencyScale),
    artisan: decimalToMinorUnits(funding?.artisan ?? "0", currencyScale),
  };
}

function calculateCouponDiscountMinor(
  coupon: ApplicableCouponRow,
  eligibleSubtotalMinor: string,
  currencyScale: number
) {
  let discountMinor =
    coupon.discount_type === "percentage"
      ? percentageDiscountMinorUnits(
          eligibleSubtotalMinor,
          coupon.discount_value
        )
      : decimalToMinorUnits(coupon.discount_value, currencyScale);

  if (
    coupon.discount_type === "percentage" &&
    coupon.max_discount_amount !== null
  ) {
    const maxDiscountMinor = decimalToMinorUnits(
      coupon.max_discount_amount,
      currencyScale
    );

    if (compareIntegerStrings(discountMinor, maxDiscountMinor) > 0) {
      discountMinor = maxDiscountMinor;
    }
  }

  if (compareIntegerStrings(discountMinor, eligibleSubtotalMinor) > 0) {
    discountMinor = eligibleSubtotalMinor;
  }

  return discountMinor;
}

function allocateCouponDiscount(
  lines: CouponAllocationLine[],
  discountMinor: string
) {
  const totalWeightMinor = sumIntegerStrings(
    lines.map((line) => line.weightMinor)
  );

  if (
    lines.length === 0 ||
    compareIntegerStrings(discountMinor, "0") === 0 ||
    compareIntegerStrings(totalWeightMinor, "0") === 0
  ) {
    return new Map(lines.map((line) => [line.itemIndex, "0"]));
  }

  const allocations: CouponAllocation[] = lines.map((line) => {
    const numerator = multiplyIntegerStrings(discountMinor, line.weightMinor);
    const { quotient, remainder } = divideIntegerStrings(
      numerator,
      totalWeightMinor
    );

    return {
      ...line,
      discountMinor: quotient,
      remainder,
    };
  });

  const allocatedMinor = sumIntegerStrings(
    allocations.map((allocation) => allocation.discountMinor)
  );
  const remainderUnits = subtractIntegerStrings(discountMinor, allocatedMinor);
  const remainderCount = Number(remainderUnits);

  if (
    !Number.isSafeInteger(remainderCount) ||
    remainderCount < 0 ||
    remainderCount > allocations.length
  ) {
    throw new Error("Invalid proportional Coupon remainder");
  }

  allocations.sort((left, right) => {
    const remainderComparison = compareIntegerStrings(
      right.remainder,
      left.remainder
    );

    if (remainderComparison !== 0) {
      return remainderComparison;
    }

    if (left.productId === right.productId) {
      return 0;
    }

    return left.productId < right.productId ? -1 : 1;
  });

  for (let index = 0; index < remainderCount; index += 1) {
    allocations[index].discountMinor = addIntegerStrings(
      allocations[index].discountMinor,
      "1"
    );
  }

  return new Map(
    allocations.map((allocation) => [
      allocation.itemIndex,
      allocation.discountMinor,
    ])
  );
}

function decorateWithoutAppliedCoupon(
  quote: PromotionCartQuote,
  currencyScale: number,
  couponCode: string | null,
  couponStatus: CouponQuoteStatus,
  eligibleProductIds: Set<string> | null = null,
  couponEligibleSubtotalMinor: string | null = null
): CouponCartQuote {
  const zero = formatMinorUnits("0", currencyScale);

  return {
    ...quote,
    items: quote.items.map((item) => ({
      ...item,
      couponEligible: Boolean(
        item.product && eligibleProductIds?.has(item.product.id)
      ),
      couponDiscount: null,
      couponFunding: null,
    })),
    promotionDiscountTotal: quote.promotionDiscountTotal,
    promotionFunding: quote.promotionFunding,
    subtotalBeforeCoupon: quote.subtotal,
    couponEligibleSubtotal:
      couponEligibleSubtotalMinor === null
        ? null
        : formatMinorUnits(couponEligibleSubtotalMinor, currencyScale),
    couponDiscountTotal: zero,
    couponFunding: emptyFunding(currencyScale),
    couponCode,
    couponStatus,
    coupon: null,
    subtotal: quote.subtotal,
  };
}

function validateCouponRow(row: ApplicableCouponRow, marketId: string) {
  if (
    row.market_id !== marketId ||
    !["percentage", "fixed"].includes(row.discount_type) ||
    !["irth", "artisan"].includes(row.funding_source) ||
    !Array.isArray(row.eligible_product_ids)
  ) {
    throw new Error("Invalid Coupon lookup response");
  }
}

export async function applyCouponToQuote(
  quote: PromotionCartQuote,
  couponCode?: string | null
): Promise<CouponCartQuote> {
  const currencyScale = getCurrencyMinorUnitScale(quote.market.currency_code);
  const normalizedCode = couponCode?.trim() || null;

  if (!normalizedCode) {
    return decorateWithoutAppliedCoupon(
      quote,
      currencyScale,
      null,
      "not_requested"
    );
  }

  const productIds = quote.items.flatMap((item) =>
    item.status === "available" && item.product ? [item.product.id] : []
  );
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_applicable_coupon", {
    p_market_id: quote.market.id,
    p_code: normalizedCode,
    p_product_ids: productIds,
  });

  if (error) {
    throw error;
  }

  const coupon = (data?.[0] ?? null) as ApplicableCouponRow | null;

  if (!coupon) {
    return decorateWithoutAppliedCoupon(
      quote,
      currencyScale,
      normalizedCode,
      "invalid_or_unavailable"
    );
  }

  validateCouponRow(coupon, quote.market.id);

  const eligibleProductIds = new Set(coupon.eligible_product_ids);
  const eligibleLines = quote.items.flatMap((item, itemIndex) => {
    if (
      item.status !== "available" ||
      !item.product ||
      !eligibleProductIds.has(item.product.id) ||
      !item.originalLineTotal ||
      !item.lineTotal
    ) {
      return [];
    }

    return [
      {
        itemIndex,
        productId: item.product.id,
        originalMinor: decimalToMinorUnits(
          item.originalLineTotal,
          currencyScale
        ),
        promotedMinor: decimalToMinorUnits(item.lineTotal, currencyScale),
        promotionDiscountMinor: decimalToMinorUnits(
          item.promotionDiscount ?? "0",
          currencyScale
        ),
        promotionFundingMinor: fundingToMinor(
          item.promotionFunding,
          currencyScale
        ),
      },
    ];
  });

  if (eligibleLines.length === 0) {
    return decorateWithoutAppliedCoupon(
      quote,
      currencyScale,
      coupon.code,
      "not_applicable",
      eligibleProductIds,
      "0"
    );
  }

  const eligibleSubtotalMinor = sumIntegerStrings(
    eligibleLines.map((line) =>
      coupon.stackable ? line.promotedMinor : line.originalMinor
    )
  );

  if (coupon.minimum_order_amount !== null) {
    const minimumMinor = decimalToMinorUnits(
      coupon.minimum_order_amount,
      currencyScale
    );

    if (compareIntegerStrings(eligibleSubtotalMinor, minimumMinor) < 0) {
      return decorateWithoutAppliedCoupon(
        quote,
        currencyScale,
        coupon.code,
        "minimum_not_met",
        eligibleProductIds,
        eligibleSubtotalMinor
      );
    }
  }

  const couponDiscountMinor = calculateCouponDiscountMinor(
    coupon,
    eligibleSubtotalMinor,
    currencyScale
  );

  if (compareIntegerStrings(couponDiscountMinor, "0") === 0) {
    return decorateWithoutAppliedCoupon(
      quote,
      currencyScale,
      coupon.code,
      "no_discount",
      eligibleProductIds,
      eligibleSubtotalMinor
    );
  }

  const eligiblePromotionDiscountMinor = sumIntegerStrings(
    eligibleLines.map((line) => line.promotionDiscountMinor)
  );

  if (
    !coupon.stackable &&
    compareIntegerStrings(
      couponDiscountMinor,
      eligiblePromotionDiscountMinor
    ) <= 0
  ) {
    return decorateWithoutAppliedCoupon(
      quote,
      currencyScale,
      coupon.code,
      "promotion_preferred",
      eligibleProductIds,
      eligibleSubtotalMinor
    );
  }

  const allocationLines: CouponAllocationLine[] = eligibleLines.map((line) => ({
    itemIndex: line.itemIndex,
    productId: line.productId,
    weightMinor: coupon.stackable ? line.promotedMinor : line.originalMinor,
  }));
  const allocationByItem = allocateCouponDiscount(
    allocationLines,
    couponDiscountMinor
  );
  const zero = formatMinorUnits("0", currencyScale);

  let actualPromotionDiscountMinor = decimalToMinorUnits(
    quote.promotionDiscountTotal,
    currencyScale
  );
  let actualPromotionIrthMinor = decimalToMinorUnits(
    quote.promotionFunding.irth,
    currencyScale
  );
  let actualPromotionArtisanMinor = decimalToMinorUnits(
    quote.promotionFunding.artisan,
    currencyScale
  );

  if (!coupon.stackable) {
    actualPromotionDiscountMinor = subtractIntegerStrings(
      actualPromotionDiscountMinor,
      eligiblePromotionDiscountMinor
    );

    for (const line of eligibleLines) {
      actualPromotionIrthMinor = subtractIntegerStrings(
        actualPromotionIrthMinor,
        line.promotionFundingMinor.irth
      );
      actualPromotionArtisanMinor = subtractIntegerStrings(
        actualPromotionArtisanMinor,
        line.promotionFundingMinor.artisan
      );
    }
  }

  const couponFundingMinor = {
    irth: coupon.funding_source === "irth" ? couponDiscountMinor : "0",
    artisan: coupon.funding_source === "artisan" ? couponDiscountMinor : "0",
  };

  const items: CouponQuoteItem[] = quote.items.map((item, itemIndex) => {
    if (
      item.status !== "available" ||
      !item.product ||
      !item.originalLineTotal ||
      !item.lineTotal
    ) {
      return {
        ...item,
        couponEligible: false,
        couponDiscount: null,
        couponFunding: null,
      };
    }

    const couponEligible = eligibleProductIds.has(item.product.id);

    if (!couponEligible) {
      return {
        ...item,
        couponEligible: false,
        couponDiscount: null,
        couponFunding: null,
      };
    }

    const allocatedDiscountMinor = allocationByItem.get(itemIndex) ?? "0";
    const lineBeforeCouponMinor = decimalToMinorUnits(
      coupon.stackable ? item.lineTotal : item.originalLineTotal,
      currencyScale
    );
    const finalLineMinor = subtractIntegerStrings(
      lineBeforeCouponMinor,
      allocatedDiscountMinor
    );
    const lineCouponFunding: CouponFunding = {
      irth:
        coupon.funding_source === "irth"
          ? formatMinorUnits(allocatedDiscountMinor, currencyScale)
          : zero,
      artisan:
        coupon.funding_source === "artisan"
          ? formatMinorUnits(allocatedDiscountMinor, currencyScale)
          : zero,
    };

    return {
      ...item,
      lineTotal: formatMinorUnits(finalLineMinor, currencyScale),
      promotion: coupon.stackable ? item.promotion : null,
      promotionDiscount: coupon.stackable ? item.promotionDiscount : zero,
      promotionFunding: coupon.stackable
        ? item.promotionFunding
        : emptyFunding(currencyScale),
      couponEligible: true,
      couponDiscount: formatMinorUnits(
        allocatedDiscountMinor,
        currencyScale
      ),
      couponFunding: lineCouponFunding,
    };
  });

  const subtotalBeforeCouponMinor = sumIntegerStrings(
    items.flatMap((item) => {
      if (
        item.status !== "available" ||
        !item.product ||
        !item.originalLineTotal
      ) {
        return [];
      }

      if (coupon.stackable || !eligibleProductIds.has(item.product.id)) {
        const originalItem = quote.items.find(
          (candidate) => candidate.slug === item.slug
        );

        if (!originalItem?.lineTotal) {
          return [];
        }

        return [decimalToMinorUnits(originalItem.lineTotal, currencyScale)];
      }

      return [decimalToMinorUnits(item.originalLineTotal, currencyScale)];
    })
  );
  const finalSubtotalMinor = subtractIntegerStrings(
    subtotalBeforeCouponMinor,
    couponDiscountMinor
  );

  return {
    ...quote,
    items,
    promotionDiscountTotal: formatMinorUnits(
      actualPromotionDiscountMinor,
      currencyScale
    ),
    promotionFunding: {
      irth: formatMinorUnits(actualPromotionIrthMinor, currencyScale),
      artisan: formatMinorUnits(actualPromotionArtisanMinor, currencyScale),
    },
    subtotalBeforeCoupon: formatMinorUnits(
      subtotalBeforeCouponMinor,
      currencyScale
    ),
    couponEligibleSubtotal: formatMinorUnits(
      eligibleSubtotalMinor,
      currencyScale
    ),
    couponDiscountTotal: formatMinorUnits(
      couponDiscountMinor,
      currencyScale
    ),
    couponFunding: {
      irth: formatMinorUnits(couponFundingMinor.irth, currencyScale),
      artisan: formatMinorUnits(couponFundingMinor.artisan, currencyScale),
    },
    couponCode: coupon.code,
    couponStatus: "applied",
    coupon: {
      id: coupon.coupon_id,
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      stackable: coupon.stackable,
      fundingSource: coupon.funding_source,
    },
    subtotal: formatMinorUnits(finalSubtotalMinor, currencyScale),
    canCheckout: quote.canCheckout,
  };
}

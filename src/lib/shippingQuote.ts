import "server-only";

import type { CouponCartQuote } from "@/lib/couponQuote";
import { createClient } from "@/lib/supabase/server";

type ShippingSettingsRow = {
  market_id: string;
  flat_shipping_fee: string;
  free_shipping_threshold: string;
};

type Decimal = {
  digits: string;
  scale: number;
};

export type ShippingQuoteStatus =
  | "flat_rate"
  | "free_shipping"
  | "configuration_missing";

export type ShippingCartQuote = CouponCartQuote & {
  merchandiseSubtotal: string;
  shippingFee: string | null;
  freeShippingThreshold: string | null;
  shippingStatus: ShippingQuoteStatus;
  finalTotal: string | null;
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

  if (normalizedLeft === normalizedRight) return 0;
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

  if (currencyScale === 0) return digits;

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

export async function applyShippingToQuote(
  quote: CouponCartQuote
): Promise<ShippingCartQuote> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_market_shipping_settings_text",
    { target_market_id: quote.market.id }
  );

  if (error) throw error;

  const settings = (data?.[0] ?? null) as ShippingSettingsRow | null;

  if (!settings) {
    return {
      ...quote,
      merchandiseSubtotal: quote.subtotal,
      shippingFee: null,
      freeShippingThreshold: null,
      shippingStatus: "configuration_missing",
      finalTotal: null,
      canCheckout: false,
    };
  }

  if (settings.market_id !== quote.market.id) {
    throw new Error("Shipping settings market mismatch");
  }

  const currencyScale = getCurrencyMinorUnitScale(quote.market.currency_code);
  const merchandiseMinor = decimalToMinorUnits(quote.subtotal, currencyScale);
  const thresholdMinor = decimalToMinorUnits(
    settings.free_shipping_threshold,
    currencyScale
  );
  const flatFeeMinor = decimalToMinorUnits(
    settings.flat_shipping_fee,
    currencyScale
  );
  const qualifiesForFreeShipping =
    compareIntegerStrings(merchandiseMinor, thresholdMinor) >= 0;
  const shippingMinor = qualifiesForFreeShipping ? "0" : flatFeeMinor;
  const finalTotalMinor = addIntegerStrings(merchandiseMinor, shippingMinor);

  return {
    ...quote,
    merchandiseSubtotal: formatMinorUnits(merchandiseMinor, currencyScale),
    shippingFee: formatMinorUnits(shippingMinor, currencyScale),
    freeShippingThreshold: formatMinorUnits(thresholdMinor, currencyScale),
    shippingStatus: qualifiesForFreeShipping ? "free_shipping" : "flat_rate",
    finalTotal: formatMinorUnits(finalTotalMinor, currencyScale),
    canCheckout: quote.canCheckout,
  };
}

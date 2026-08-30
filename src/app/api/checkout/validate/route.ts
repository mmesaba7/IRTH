import { NextRequest, NextResponse } from "next/server";
import { quoteCart, type CartQuoteInputItem } from "@/lib/cartQuote";
import { applyPromotionsToQuote } from "@/lib/promotionQuote";
import { applyCouponToQuote } from "@/lib/couponQuote";
import { applyShippingToQuote } from "@/lib/shippingQuote";
import { getSelectedMarket } from "@/lib/marketSelection";
import { createClient } from "@/lib/supabase/server";

const EGYPT_ADMINISTRATIVE_AREAS = new Set([
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
]);

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

type CheckoutFieldErrors = Partial<Record<keyof CheckoutCustomer, string>>;

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function parseItems(body: unknown): CartQuoteInputItem[] | null {
  if (typeof body !== "object" || body === null || !("items" in body)) return null;
  const rawItems = (body as { items?: unknown }).items;
  if (!Array.isArray(rawItems)) return null;

  const items: CartQuoteInputItem[] = [];
  for (const rawItem of rawItems) {
    if (typeof rawItem !== "object" || rawItem === null) return null;
    const slug = "slug" in rawItem ? (rawItem as { slug?: unknown }).slug : null;
    const quantity = "quantity" in rawItem ? (rawItem as { quantity?: unknown }).quantity : null;

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
  if (typeof body !== "object" || body === null || !("couponCode" in body)) return null;
  const raw = (body as { couponCode?: unknown }).couponCode;
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") return undefined;
  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : null;
}

function readString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value: string) {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return `${hasPlus ? "+" : ""}${digits}`;
}

function validateCustomer(
  rawCustomer: unknown,
  marketCountryCode: string
): { customer: CheckoutCustomer | null; errors: CheckoutFieldErrors } {
  if (typeof rawCustomer !== "object" || rawCustomer === null) {
    return { customer: null, errors: { recipientName: "Customer details are required." } };
  }

  const source = rawCustomer as Record<string, unknown>;
  const customer: CheckoutCustomer = {
    recipientName: readString(source, "recipientName"),
    email: readString(source, "email").toLowerCase(),
    phone: normalizePhone(readString(source, "phone")),
    countryCode: readString(source, "countryCode").toUpperCase(),
    administrativeArea: readString(source, "administrativeArea"),
    city: readString(source, "city"),
    addressLine1: readString(source, "addressLine1"),
    deliveryNotes: readString(source, "deliveryNotes"),
  };

  const errors: CheckoutFieldErrors = {};

  if (customer.recipientName.length < 2 || customer.recipientName.length > 120) {
    errors.recipientName = "Enter the recipient full name.";
  }

  if (
    customer.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)
  ) {
    errors.email = "Enter a valid email address.";
  }

  const phoneDigits = customer.phone.replace(/\D/g, "");
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    errors.phone = "Enter a valid phone number.";
  }

  if (customer.countryCode !== marketCountryCode) {
    errors.countryCode = "Delivery country must match the selected market.";
  }

  if (
    customer.administrativeArea.length < 2 ||
    customer.administrativeArea.length > 120
  ) {
    errors.administrativeArea = "Select or enter a valid administrative area.";
  } else if (
    marketCountryCode === "EG" &&
    !EGYPT_ADMINISTRATIVE_AREAS.has(customer.administrativeArea)
  ) {
    errors.administrativeArea = "Select a valid Egyptian governorate.";
  }

  if (customer.city.length < 2 || customer.city.length > 120) {
    errors.city = "Enter a valid city.";
  }

  if (customer.addressLine1.length < 5 || customer.addressLine1.length > 240) {
    errors.addressLine1 = "Enter a complete delivery address.";
  }

  if (customer.deliveryNotes.length > 500) {
    errors.deliveryNotes = "Delivery notes must be 500 characters or fewer.";
  }

  return {
    customer: Object.keys(errors).length === 0 ? customer : null,
    errors,
  };
}

export async function GET() {
  try {
    const [market, supabase] = await Promise.all([getSelectedMarket(), createClient()]);
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    let displayName: string | null = null;
    if (user) {
      const { data } = await supabase
        .from("user_accounts")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      displayName = data?.display_name ?? null;
    }

    return jsonNoStore({
      authenticated: Boolean(user),
      customer: user
        ? {
            recipientName: displayName ?? "",
            email: user.email ?? "",
          }
        : null,
      market: market
        ? {
            id: market.id,
            slug: market.slug,
            currencyCode: market.currency_code,
            country: market.country,
          }
        : null,
    });
  } catch (error) {
    console.error("Unable to load checkout context:", error);
    return jsonNoStore({ error: "Unable to load checkout context" }, 500);
  }
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
  if (!items || couponCode === undefined) {
    return jsonNoStore({ error: "Invalid checkout cart input" }, 400);
  }

  try {
    const [market, supabase] = await Promise.all([getSelectedMarket(), createClient()]);
    if (!market) {
      return jsonNoStore({ error: "A market must be selected before checkout" }, 409);
    }

    const marketCountryCode = market.country.iso_code;
    const rawCustomer =
      typeof body === "object" && body !== null && "customer" in body
        ? (body as { customer?: unknown }).customer
        : null;
    const customerValidation = validateCustomer(rawCustomer, marketCountryCode);

    if (!customerValidation.customer) {
      return jsonNoStore(
        { valid: false, fieldErrors: customerValidation.errors },
        422
      );
    }

    const baseQuote = await quoteCart(items);
    if (!baseQuote) {
      return jsonNoStore({ error: "A market must be selected before checkout" }, 409);
    }

    const promotionQuote = await applyPromotionsToQuote(baseQuote);
    const couponQuote = await applyCouponToQuote(promotionQuote, couponCode);
    const quote = await applyShippingToQuote(couponQuote);

    if (quote.shippingStatus === "configuration_missing") {
      return jsonNoStore(
        {
          valid: false,
          error: "Shipping is not configured for the selected market yet.",
        },
        409
      );
    }

    if (!quote.canCheckout || quote.finalTotal === null) {
      return jsonNoStore(
        { valid: false, error: "Cart changed and must be reviewed before checkout." },
        409
      );
    }

    const { data: authData } = await supabase.auth.getUser();

    return jsonNoStore({
      valid: true,
      authenticated: Boolean(authData.user),
      market: {
        id: market.id,
        slug: market.slug,
        currencyCode: market.currency_code,
        countryCode: marketCountryCode,
      },
      quote: {
        subtotalBeforePromotions: quote.subtotalBeforePromotions,
        promotionDiscountTotal: quote.promotionDiscountTotal,
        couponDiscountTotal: quote.couponDiscountTotal,
        couponCode: quote.couponCode,
        subtotal: quote.subtotal,
        merchandiseSubtotal: quote.merchandiseSubtotal,
        shippingFee: quote.shippingFee,
        freeShippingThreshold: quote.freeShippingThreshold,
        shippingStatus: quote.shippingStatus,
        finalTotal: quote.finalTotal,
        canCheckout: quote.canCheckout,
      },
      nextStepReady: true,
      orderCreated: false,
    });
  } catch (error) {
    console.error("Unable to validate checkout:", error);
    return jsonNoStore({ error: "Unable to validate checkout" }, 500);
  }
}

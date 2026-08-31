import { createHash, createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { quoteCart, type CartQuoteInputItem } from "@/lib/cartQuote";
import { applyPromotionsToQuote } from "@/lib/promotionQuote";
import { applyCouponToQuote } from "@/lib/couponQuote";
import { applyShippingToQuote } from "@/lib/shippingQuote";
import { getSelectedMarket } from "@/lib/marketSelection";
import { validateCheckoutCustomer } from "@/lib/checkoutCustomer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
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

function hashIdentity(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function createGuestTrackingToken(idempotencyScope: string, idempotencyKey: string) {
  const secret = process.env.IRTH_GUEST_TRACKING_SECRET?.trim();

  if (!secret || secret.length < 32) {
    throw new Error("Missing guest tracking secret configuration");
  }

  return createHmac("sha256", secret)
    .update(`irth-guest-tracking:v1:${idempotencyScope}:${idempotencyKey}`)
    .digest("base64url");
}

function mapOrderError(message: string) {
  if (message.includes("commission_not_configured")) {
    return {
      status: 409,
      error: "Order creation is not available until commission is configured for every item.",
      code: "commission_not_configured",
    };
  }

  if (
    message.includes("insufficient_stock") ||
    message.includes("product_or_price_changed") ||
    message.includes("promotion_changed") ||
    message.includes("coupon_changed") ||
    message.includes("coupon_usage_exhausted") ||
    message.includes("coupon_customer_limit_reached") ||
    message.includes("shipping_configuration_missing") ||
    message.includes("market_changed") ||
    message.includes("order_totals_changed") ||
    message.includes("order_item_totals_changed") ||
    message.includes("order_aggregate_totals_changed")
  ) {
    return {
      status: 409,
      error: "Your cart changed while the order was being created. Review the latest total and try again.",
      code: "order_revalidation_failed",
    };
  }

  return {
    status: 500,
    error: "Unable to create order.",
    code: "order_creation_failed",
  };
}

export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";

  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
    return jsonNoStore(
      { error: "A valid Idempotency-Key header is required." },
      400
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: "Invalid request body" }, 400);
  }

  const items = parseItems(body);
  const couponCode = parseCouponCode(body);
  if (!items || items.length === 0 || couponCode === undefined) {
    return jsonNoStore({ error: "Invalid order cart input" }, 400);
  }

  try {
    const [market, supabase] = await Promise.all([getSelectedMarket(), createClient()]);
    if (!market) {
      return jsonNoStore({ error: "A market must be selected before ordering" }, 409);
    }

    const rawCustomer =
      typeof body === "object" && body !== null && "customer" in body
        ? (body as { customer?: unknown }).customer
        : null;
    const customerValidation = validateCheckoutCustomer(
      rawCustomer,
      market.country.iso_code
    );

    if (!customerValidation.customer) {
      return jsonNoStore(
        { valid: false, fieldErrors: customerValidation.errors },
        422
      );
    }

    const baseQuote = await quoteCart(items);
    if (!baseQuote) {
      return jsonNoStore({ error: "A market must be selected before ordering" }, 409);
    }

    const promotionQuote = await applyPromotionsToQuote(baseQuote);
    const couponQuote = await applyCouponToQuote(promotionQuote, couponCode);
    const quote = await applyShippingToQuote(couponQuote);

    if (
      !quote.canCheckout ||
      quote.shippingStatus === "configuration_missing" ||
      quote.shippingFee === null ||
      quote.finalTotal === null
    ) {
      return jsonNoStore(
        { error: "Cart must be reviewed before the order can be created." },
        409
      );
    }

    const transactionItems = quote.items.map((item) => {
      if (
        item.status !== "available" ||
        !item.product ||
        !item.unitPrice ||
        !item.originalLineTotal ||
        !item.lineTotal
      ) {
        throw new Error("Trusted quote contains a non-orderable item");
      }

      return {
        productId: item.product.id,
        quantity: item.requestedQuantity,
        unitPrice: item.unitPrice,
        originalLineTotal: item.originalLineTotal,
        promotionId: item.promotion?.id ?? null,
        promotionDiscount: item.promotionDiscount ?? "0",
        promotionFundingIrth: item.promotionFunding?.irth ?? "0",
        promotionFundingArtisan: item.promotionFunding?.artisan ?? "0",
        couponDiscount: item.couponDiscount ?? "0",
        couponFundingIrth: item.couponFunding?.irth ?? "0",
        couponFundingArtisan: item.couponFunding?.artisan ?? "0",
        lineTotal: item.lineTotal,
      };
    });

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    const customer = customerValidation.customer;
    const guestIdentityHash = user ? null : hashIdentity(customer.email);
    const idempotencyScope = user
      ? `user:${user.id}`
      : `guest:${guestIdentityHash}`;
    const guestTrackingToken = user
      ? null
      : createGuestTrackingToken(idempotencyScope, idempotencyKey);
    const guestAccessTokenHash = guestTrackingToken
      ? hashIdentity(guestTrackingToken)
      : null;

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("create_order_transaction", {
      p_order: {
        marketId: market.id,
        currencyCode: market.currency_code,
        customerUserId: user?.id ?? null,
        guestIdentityHash,
        subtotalBeforePromotions: quote.subtotalBeforePromotions,
        promotionDiscountTotal: quote.promotionDiscountTotal,
        couponDiscountTotal: quote.couponDiscountTotal,
        merchandiseSubtotal: quote.merchandiseSubtotal,
        shippingFee: quote.shippingFee,
        finalTotal: quote.finalTotal,
        couponId: quote.coupon?.id ?? null,
        couponCode: quote.coupon?.code ?? null,
      },
      p_customer: customer,
      p_items: transactionItems,
      p_idempotency_scope: idempotencyScope,
      p_idempotency_key: idempotencyKey,
      p_guest_access_token_hash: guestAccessTokenHash,
    });

    if (error) {
      console.error("Order transaction failed:", error.message);
      const mapped = mapOrderError(error.message);
      return jsonNoStore({ error: mapped.error, code: mapped.code }, mapped.status);
    }

    const result = Array.isArray(data) ? data[0] : null;
    if (!result?.order_id || !result?.order_number) {
      return jsonNoStore({ error: "Unable to create order." }, 500);
    }

    return jsonNoStore(
      {
        order: {
          id: result.order_id,
          orderNumber: result.order_number,
          status: "received",
          paymentStatus: "pending",
          reused: Boolean(result.reused),
          guestTrackingToken,
        },
      },
      result.reused ? 200 : 201
    );
  } catch (error) {
    console.error("Unable to create order:", error);

    if (
      error instanceof Error &&
      error.message === "Missing server-side Supabase secret configuration"
    ) {
      return jsonNoStore(
        {
          error: "Server order creation is not configured yet.",
          code: "server_secret_missing",
        },
        503
      );
    }

    if (
      error instanceof Error &&
      error.message === "Missing guest tracking secret configuration"
    ) {
      return jsonNoStore(
        {
          error: "Guest order tracking is not configured yet.",
          code: "guest_tracking_secret_missing",
        },
        503
      );
    }

    return jsonNoStore({ error: "Unable to create order" }, 500);
  }
}

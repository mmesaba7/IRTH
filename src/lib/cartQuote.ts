import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getSelectedMarket } from "@/lib/marketSelection";

export type CartQuoteInputItem = {
  slug: string;
  quantity: number;
};

export type CartQuoteItemStatus =
  | "available"
  | "product_unavailable"
  | "not_priced_for_market"
  | "out_of_stock"
  | "insufficient_stock";

export type CartQuoteItem = {
  slug: string;
  requestedQuantity: number;
  status: CartQuoteItemStatus;
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

export type CartQuote = {
  market: {
    id: string;
    slug: string;
    currency_code: string;
  };
  items: CartQuoteItem[];
  subtotal: string;
  canCheckout: boolean;
};

type Decimal = {
  coefficient: bigint;
  scale: number;
};

function parseDecimal(value: string): Decimal {
  const normalized = value.trim();

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error("Invalid non-negative decimal value");
  }

  const [whole, fraction = ""] = normalized.split(".");

  return {
    coefficient: BigInt(`${whole}${fraction}`),
    scale: fraction.length,
  };
}

function formatDecimal(value: Decimal) {
  const digits = value.coefficient.toString();

  if (value.scale === 0) {
    return digits;
  }

  const padded = digits.padStart(value.scale + 1, "0");
  const whole = padded.slice(0, -value.scale);
  const fraction = padded.slice(-value.scale);

  return `${whole}.${fraction}`;
}

function multiplyDecimal(value: string, multiplier: number) {
  const decimal = parseDecimal(value);

  return formatDecimal({
    coefficient: decimal.coefficient * BigInt(multiplier),
    scale: decimal.scale,
  });
}

function addDecimals(values: string[]) {
  if (values.length === 0) {
    return "0";
  }

  const decimals = values.map(parseDecimal);
  const maxScale = Math.max(...decimals.map((value) => value.scale));
  const coefficient = decimals.reduce((sum, value) => {
    const scaleDifference = maxScale - value.scale;
    return sum + value.coefficient * 10n ** BigInt(scaleDifference);
  }, 0n);

  return formatDecimal({ coefficient, scale: maxScale });
}

function aggregateItems(items: CartQuoteInputItem[]) {
  const quantities = new Map<string, number>();

  for (const item of items) {
    const slug = item.slug.trim();

    if (!slug || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Invalid cart item");
    }

    const nextQuantity = (quantities.get(slug) ?? 0) + item.quantity;

    if (!Number.isSafeInteger(nextQuantity)) {
      throw new Error("Invalid cart quantity");
    }

    quantities.set(slug, nextQuantity);
  }

  return Array.from(quantities, ([slug, quantity]) => ({ slug, quantity }));
}

export async function quoteCart(inputItems: CartQuoteInputItem[]) {
  const selectedMarket = await getSelectedMarket();

  if (!selectedMarket) {
    return null;
  }

  const items = aggregateItems(inputItems);

  if (items.length === 0) {
    return {
      market: {
        id: selectedMarket.id,
        slug: selectedMarket.slug,
        currency_code: selectedMarket.currency_code,
      },
      items: [],
      subtotal: "0",
      canCheckout: false,
    } satisfies CartQuote;
  }

  const supabase = await createClient();
  const slugs = items.map((item) => item.slug);

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      "id, slug, name_ar, name_en, artisan_id, primary_craft_id, lifecycle_status, quantity, made_to_order, preparation_time"
    )
    .in("slug", slugs)
    .eq("lifecycle_status", "published");

  if (productsError) {
    throw productsError;
  }

  const productRows = products ?? [];
  const artisanIds = [...new Set(productRows.map((product) => product.artisan_id))];
  const craftIds = [...new Set(productRows.map((product) => product.primary_craft_id))];
  const productIds = productRows.map((product) => product.id);

  const [artisansResult, craftsResult, pricesResult] = await Promise.all([
    artisanIds.length > 0
      ? supabase
          .from("artisan_profiles")
          .select("id, name_ar, name_en, country_id, status")
          .in("id", artisanIds)
          .eq("status", "active")
      : Promise.resolve({ data: [], error: null }),
    craftIds.length > 0
      ? supabase
          .from("crafts")
          .select("id, is_active")
          .in("id", craftIds)
          .eq("is_active", true)
      : Promise.resolve({ data: [], error: null }),
    productIds.length > 0
      ? supabase
          .from("product_market_prices")
          .select("product_id, price, is_active")
          .eq("market_id", selectedMarket.id)
          .eq("is_active", true)
          .in("product_id", productIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (artisansResult.error) throw artisansResult.error;
  if (craftsResult.error) throw craftsResult.error;
  if (pricesResult.error) throw pricesResult.error;

  const artisans = artisansResult.data ?? [];
  const countryIds = [...new Set(artisans.map((artisan) => artisan.country_id))];

  const { data: countries, error: countriesError } = countryIds.length > 0
    ? await supabase
        .from("countries")
        .select("id, is_active")
        .in("id", countryIds)
        .eq("is_active", true)
    : { data: [], error: null };

  if (countriesError) {
    throw countriesError;
  }

  const productBySlug = new Map(productRows.map((product) => [product.slug, product]));
  const artisanById = new Map(artisans.map((artisan) => [artisan.id, artisan]));
  const activeCraftIds = new Set((craftsResult.data ?? []).map((craft) => craft.id));
  const activeCountryIds = new Set((countries ?? []).map((country) => country.id));
  const priceByProductId = new Map(
    (pricesResult.data ?? []).map((price) => [price.product_id, String(price.price)])
  );

  const quoteItems: CartQuoteItem[] = items.map(({ slug, quantity }) => {
    const product = productBySlug.get(slug);

    if (!product) {
      return {
        slug,
        requestedQuantity: quantity,
        status: "product_unavailable",
        product: null,
        unitPrice: null,
        lineTotal: null,
      };
    }

    const artisan = artisanById.get(product.artisan_id);
    const publiclyAvailable = Boolean(
      artisan &&
        activeCountryIds.has(artisan.country_id) &&
        activeCraftIds.has(product.primary_craft_id)
    );

    if (!publiclyAvailable || !artisan) {
      return {
        slug,
        requestedQuantity: quantity,
        status: "product_unavailable",
        product: null,
        unitPrice: null,
        lineTotal: null,
      };
    }

    const productDetails = {
      id: product.id,
      name_ar: product.name_ar,
      name_en: product.name_en,
      artisan_name_ar: artisan.name_ar,
      artisan_name_en: artisan.name_en,
      made_to_order: product.made_to_order,
      preparation_time: product.preparation_time,
      available_quantity: product.made_to_order ? null : product.quantity,
    };

    const unitPrice = priceByProductId.get(product.id);

    if (!unitPrice) {
      return {
        slug,
        requestedQuantity: quantity,
        status: "not_priced_for_market",
        product: productDetails,
        unitPrice: null,
        lineTotal: null,
      };
    }

    if (!product.made_to_order) {
      const availableQuantity = product.quantity ?? 0;

      if (availableQuantity <= 0) {
        return {
          slug,
          requestedQuantity: quantity,
          status: "out_of_stock",
          product: productDetails,
          unitPrice,
          lineTotal: null,
        };
      }

      if (quantity > availableQuantity) {
        return {
          slug,
          requestedQuantity: quantity,
          status: "insufficient_stock",
          product: productDetails,
          unitPrice,
          lineTotal: null,
        };
      }
    }

    return {
      slug,
      requestedQuantity: quantity,
      status: "available",
      product: productDetails,
      unitPrice,
      lineTotal: multiplyDecimal(unitPrice, quantity),
    };
  });

  const subtotal = addDecimals(
    quoteItems.flatMap((item) => (item.lineTotal ? [item.lineTotal] : []))
  );

  return {
    market: {
      id: selectedMarket.id,
      slug: selectedMarket.slug,
      currency_code: selectedMarket.currency_code,
    },
    items: quoteItems,
    subtotal,
    canCheckout:
      quoteItems.length > 0 && quoteItems.every((item) => item.status === "available"),
  } satisfies CartQuote;
}

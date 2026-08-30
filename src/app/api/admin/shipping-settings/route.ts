import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getCurrencyScale(currencyCode: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
  }).resolvedOptions().maximumFractionDigits;
}

function normalizeMoneyInput(value: unknown, scale: number, allowZero: boolean) {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > scale) return null;

  const isZero = `${whole}${fraction}`.replace(/0/g, "").length === 0;
  if (!allowZero && isZero) return null;

  return normalized;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: markets, error: marketsError } = await supabase
      .from("markets")
      .select("id, slug, currency_code")
      .eq("is_active", true)
      .order("slug");

    if (marketsError) {
      return jsonNoStore({ error: "Unable to load active markets" }, 500);
    }

    const activeMarkets = markets ?? [];
    if (activeMarkets.length === 0) {
      return jsonNoStore({ markets: [] });
    }

    const marketIds = activeMarkets.map((market) => market.id);
    const { data: settings, error: settingsError } = await supabase
      .from("market_shipping_settings")
      .select("market_id, flat_shipping_fee, free_shipping_threshold")
      .in("market_id", marketIds);

    if (settingsError) {
      return jsonNoStore({ error: "Unable to load shipping settings" }, 500);
    }

    const settingsByMarket = new Map(
      (settings ?? []).map((setting) => [setting.market_id, setting])
    );

    return jsonNoStore({
      markets: activeMarkets.map((market) => {
        const setting = settingsByMarket.get(market.id);
        return {
          id: market.id,
          slug: market.slug,
          currencyCode: market.currency_code,
          flatShippingFee: setting?.flat_shipping_fee?.toString() ?? null,
          freeShippingThreshold:
            setting?.free_shipping_threshold?.toString() ?? null,
        };
      }),
    });
  } catch (error) {
    console.error("Unable to load admin shipping settings:", error);
    return jsonNoStore({ error: "Unable to load shipping settings" }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: "Invalid request body" }, 400);
  }

  if (typeof body !== "object" || body === null) {
    return jsonNoStore({ error: "Invalid request body" }, 400);
  }

  const source = body as Record<string, unknown>;
  const marketId = typeof source.marketId === "string" ? source.marketId.trim() : "";

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(marketId)) {
    return jsonNoStore({ error: "Invalid market" }, 400);
  }

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return jsonNoStore({ error: "Authentication required" }, 401);
    }

    const { data: market, error: marketError } = await supabase
      .from("markets")
      .select("id, currency_code")
      .eq("id", marketId)
      .eq("is_active", true)
      .maybeSingle();

    if (marketError) {
      return jsonNoStore({ error: "Unable to verify market" }, 500);
    }

    if (!market) {
      return jsonNoStore({ error: "Active market not found" }, 404);
    }

    const scale = getCurrencyScale(market.currency_code);
    const flatShippingFee = normalizeMoneyInput(
      source.flatShippingFee,
      scale,
      true
    );
    const freeShippingThreshold = normalizeMoneyInput(
      source.freeShippingThreshold,
      scale,
      false
    );

    if (!flatShippingFee || !freeShippingThreshold) {
      return jsonNoStore(
        {
          error: `Enter valid ${market.currency_code} amounts with at most ${scale} decimal places.`,
        },
        422
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("market_shipping_settings")
      .update({
        flat_shipping_fee: flatShippingFee,
        free_shipping_threshold: freeShippingThreshold,
        updated_at: new Date().toISOString(),
      })
      .eq("market_id", marketId)
      .select("market_id, flat_shipping_fee, free_shipping_threshold")
      .maybeSingle();

    if (updateError) {
      console.error("Unable to update shipping settings:", updateError);
      return jsonNoStore({ error: "Unable to update shipping settings" }, 500);
    }

    if (!updated) {
      return jsonNoStore(
        { error: "Only the Super Admin can update shipping settings." },
        403
      );
    }

    return jsonNoStore({
      marketId: updated.market_id,
      flatShippingFee: updated.flat_shipping_fee.toString(),
      freeShippingThreshold: updated.free_shipping_threshold.toString(),
    });
  } catch (error) {
    console.error("Unable to update admin shipping settings:", error);
    return jsonNoStore({ error: "Unable to update shipping settings" }, 500);
  }
}

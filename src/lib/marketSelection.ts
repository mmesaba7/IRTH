import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const MARKET_COOKIE = "irth-market";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type MarketCountry = {
  slug: string;
  name_ar: string | null;
  name_en: string;
  iso_code: string;
};

export type ActiveMarket = {
  id: string;
  slug: string;
  currency_code: string;
  country: MarketCountry;
};

export async function getActiveMarketById(marketId: string): Promise<ActiveMarket | null> {
  if (!UUID_PATTERN.test(marketId)) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("markets")
    .select(
      "id, slug, currency_code, country:countries!markets_country_id_fkey(slug, name_ar, name_en, iso_code)"
    )
    .eq("id", marketId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const country = Array.isArray(data.country) ? data.country[0] : data.country;

  if (!country) {
    return null;
  }

  return {
    id: data.id,
    slug: data.slug,
    currency_code: data.currency_code,
    country,
  };
}

export async function getSelectedMarket() {
  const cookieStore = await cookies();
  const marketId = cookieStore.get(MARKET_COOKIE)?.value;

  if (!marketId) {
    return null;
  }

  return getActiveMarketById(marketId);
}

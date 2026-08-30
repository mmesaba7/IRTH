import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const MARKET_COOKIE = "irth-market";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getActiveMarketById(marketId: string) {
  if (!UUID_PATTERN.test(marketId)) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("markets")
    .select(
      "id, slug, currency_code, country:countries!markets_country_id_fkey(slug, name_ar, name_en)"
    )
    .eq("id", marketId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getSelectedMarket() {
  const cookieStore = await cookies();
  const marketId = cookieStore.get(MARKET_COOKIE)?.value;

  if (!marketId) {
    return null;
  }

  return getActiveMarketById(marketId);
}

import { createClient } from "@/lib/supabase/server";

const COUNTRY_CODE_HEADERS = [
  "x-country-code",
  "x-vercel-ip-country",
  "cf-ipcountry",
] as const;

export type MarketSuggestion = {
  id: string;
  slug: string;
  currency_code: string;
  country:
    | {
        slug: string;
        name_ar: string;
        name_en: string;
      }
    | {
        slug: string;
        name_ar: string;
        name_en: string;
      }[];
};

export function detectCountryCode(headers: Headers) {
  for (const headerName of COUNTRY_CODE_HEADERS) {
    const value = headers.get(headerName)?.trim().toUpperCase();

    if (value && /^[A-Z]{2}$/.test(value)) {
      return value;
    }
  }

  return null;
}

export async function suggestMarketForCountryCode(countryCode: string) {
  const normalizedCountryCode = countryCode.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
    return null;
  }

  const supabase = await createClient();

  const { data: country, error: countryError } = await supabase
    .from("countries")
    .select("id")
    .eq("iso_code", normalizedCountryCode)
    .eq("is_active", true)
    .maybeSingle();

  if (countryError) {
    throw countryError;
  }

  if (!country) {
    return null;
  }

  const { data: markets, error: marketsError } = await supabase
    .from("markets")
    .select(
      "id, slug, currency_code, country:countries!markets_country_id_fkey(slug, name_ar, name_en)"
    )
    .eq("country_id", country.id)
    .eq("is_active", true)
    .limit(2);

  if (marketsError) {
    throw marketsError;
  }

  // Never guess when more than one active market exists for the same country.
  if (!markets || markets.length !== 1) {
    return null;
  }

  return markets[0] as MarketSuggestion;
}

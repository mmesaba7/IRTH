import { NextRequest, NextResponse } from "next/server";
import {
  detectCountryCode,
  suggestMarketForCountryCode,
} from "@/lib/marketSuggestion";

export async function GET(request: NextRequest) {
  const countryCode = detectCountryCode(request.headers);

  if (!countryCode) {
    return NextResponse.json({ suggestion: null, countryCode: null });
  }

  try {
    const suggestion = await suggestMarketForCountryCode(countryCode);

    return NextResponse.json({ suggestion, countryCode });
  } catch {
    return NextResponse.json(
      { error: "Unable to suggest market" },
      { status: 500 }
    );
  }
}

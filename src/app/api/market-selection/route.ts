import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const MARKET_COOKIE = "irth-market";

async function getActiveMarketById(marketId: string) {
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

export async function GET() {
  const cookieStore = await cookies();
  const marketId = cookieStore.get(MARKET_COOKIE)?.value;

  if (!marketId) {
    return NextResponse.json({ market: null });
  }

  try {
    const market = await getActiveMarketById(marketId);

    if (!market) {
      const response = NextResponse.json({ market: null });
      response.cookies.delete(MARKET_COOKIE);
      return response;
    }

    return NextResponse.json({ market });
  } catch {
    return NextResponse.json(
      { error: "Unable to resolve selected market" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const marketId =
    typeof body === "object" && body !== null && "marketId" in body
      ? (body as { marketId?: unknown }).marketId
      : null;

  if (typeof marketId !== "string" || marketId.length === 0) {
    return NextResponse.json({ error: "marketId is required" }, { status: 400 });
  }

  try {
    const market = await getActiveMarketById(marketId);

    if (!market) {
      return NextResponse.json(
        { error: "Market is not available" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ market });

    response.cookies.set(MARKET_COOKIE, market.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to save selected market" },
      { status: 500 }
    );
  }
}

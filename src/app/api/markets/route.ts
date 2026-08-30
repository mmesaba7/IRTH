import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("markets")
    .select(
      "id, slug, currency_code, country:countries!markets_country_id_fkey(slug, name_ar, name_en)"
    )
    .eq("is_active", true)
    .order("slug");

  if (error) {
    return NextResponse.json(
      { error: "Unable to load markets" },
      { status: 500 }
    );
  }

  return NextResponse.json({ markets: data ?? [] });
}

import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/serverApi";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const normalized = slug.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(normalized)) {
    return jsonNoStore({ error: "Invalid product." }, 400);
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_published_product_reviews", {
      p_product_slug: normalized,
    });
    if (error) return jsonNoStore({ error: "Unable to load reviews." }, 500);
    return jsonNoStore({ reviews: Array.isArray(data) ? data : [] });
  } catch {
    return jsonNoStore({ error: "Review service is unavailable." }, 503);
  }
}

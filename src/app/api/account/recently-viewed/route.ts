import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOriginMutation, jsonNoStore } from "@/lib/serverApi";

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function cleanSlug(value: unknown) {
  if (typeof value !== "string") return null;
  const slug = value.trim();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug) ? slug : null;
}

export async function GET() {
  try {
    const userId = await currentUserId();
    if (!userId) return jsonNoStore({ authenticated: false, slugs: [] }, 401);
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_customer_recently_viewed_product_slugs", {
      p_user_id: userId,
    });
    if (error) return jsonNoStore({ error: "Unable to load recently viewed products." }, 500);
    const slugs = (Array.isArray(data) ? data : [])
      .map((row) => (row && typeof row === "object" && "slug" in row ? String(row.slug) : ""))
      .filter(Boolean);
    return jsonNoStore({ authenticated: true, slugs });
  } catch {
    return jsonNoStore({ error: "Recently viewed service is unavailable." }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin history changes are not allowed." }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid recently viewed request." }, 400);
  }
  const slug = cleanSlug(body.slug);
  if (!slug) return jsonNoStore({ error: "Invalid product." }, 422);

  try {
    const userId = await currentUserId();
    if (!userId) return jsonNoStore({ authenticated: false }, 401);
    const admin = createAdminClient();
    const { error } = await admin.rpc("record_customer_recently_viewed_product", {
      p_user_id: userId,
      p_product_slug: slug,
    });
    if (error) {
      if (error.message.includes("product_unavailable")) return jsonNoStore({ error: "Product is unavailable." }, 404);
      return jsonNoStore({ error: "Unable to record recently viewed product." }, 500);
    }
    return jsonNoStore({ ok: true });
  } catch {
    return jsonNoStore({ error: "Recently viewed service is unavailable." }, 503);
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin history changes are not allowed." }, 403);
  try {
    const userId = await currentUserId();
    if (!userId) return jsonNoStore({ authenticated: false }, 401);
    const admin = createAdminClient();
    const { error } = await admin.rpc("clear_customer_recently_viewed_products", { p_user_id: userId });
    if (error) return jsonNoStore({ error: "Unable to clear recently viewed products." }, 500);
    return jsonNoStore({ ok: true });
  } catch {
    return jsonNoStore({ error: "Recently viewed service is unavailable." }, 503);
  }
}

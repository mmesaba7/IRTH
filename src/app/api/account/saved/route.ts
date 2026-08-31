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
    const { data, error } = await admin.rpc("get_customer_saved_product_slugs", {
      p_user_id: userId,
    });
    if (error) return jsonNoStore({ error: "Unable to load saved products." }, 500);

    const slugs = (Array.isArray(data) ? data : [])
      .map((row) => (row && typeof row === "object" && "slug" in row ? String(row.slug) : ""))
      .filter(Boolean);
    return jsonNoStore({ authenticated: true, slugs });
  } catch {
    return jsonNoStore({ error: "Saved products service is unavailable." }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin saved-product changes are not allowed." }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid saved-product request." }, 400);
  }

  const slug = cleanSlug(body.slug);
  if (!slug || typeof body.saved !== "boolean") return jsonNoStore({ error: "Invalid saved-product request." }, 422);

  try {
    const userId = await currentUserId();
    if (!userId) return jsonNoStore({ authenticated: false }, 401);
    const admin = createAdminClient();
    const { error } = await admin.rpc("set_customer_saved_product", {
      p_user_id: userId,
      p_product_slug: slug,
      p_saved: body.saved,
    });
    if (error) {
      if (error.message.includes("product_not_found") || error.message.includes("product_unavailable")) {
        return jsonNoStore({ error: "Product is not available to save." }, 404);
      }
      return jsonNoStore({ error: "Unable to update saved products." }, 500);
    }
    return jsonNoStore({ ok: true, slug, saved: body.saved });
  } catch {
    return jsonNoStore({ error: "Saved products service is unavailable." }, 503);
  }
}

export async function PUT(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin saved-product changes are not allowed." }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid saved-product request." }, 400);
  }

  const raw = Array.isArray(body.slugs) ? body.slugs : null;
  if (!raw) return jsonNoStore({ error: "Invalid saved-product request." }, 422);
  const slugs = [...new Set(raw.map(cleanSlug).filter((slug): slug is string => Boolean(slug)))];
  if (slugs.length !== raw.length) return jsonNoStore({ error: "Saved products contain invalid product identifiers." }, 422);

  try {
    const userId = await currentUserId();
    if (!userId) return jsonNoStore({ authenticated: false }, 401);
    const admin = createAdminClient();
    const { error } = await admin.rpc("merge_customer_saved_products", {
      p_user_id: userId,
      p_product_slugs: slugs,
    });
    if (error) return jsonNoStore({ error: "Unable to merge saved products." }, 500);

    const { data, error: readError } = await admin.rpc("get_customer_saved_product_slugs", { p_user_id: userId });
    if (readError) return jsonNoStore({ error: "Unable to reload saved products." }, 500);
    const merged = (Array.isArray(data) ? data : [])
      .map((row) => (row && typeof row === "object" && "slug" in row ? String(row.slug) : ""))
      .filter(Boolean);
    return jsonNoStore({ authenticated: true, slugs: merged });
  } catch {
    return jsonNoStore({ error: "Saved products service is unavailable." }, 503);
  }
}

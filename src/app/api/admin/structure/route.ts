import { NextRequest } from "next/server";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { cleanText, isSameOriginMutation, isUuid, jsonNoStore } from "@/lib/serverApi";

async function getContext() {
  const ctx = await getPayoutServerContext();
  if (!ctx) return null;
  return ctx;
}

function parseReason(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return cleanText(value, 1, 1000);
}

export async function GET() {
  try {
    const ctx = await getContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
    const { data, error } = await ctx.admin.rpc("get_admin_structure_overview", {
      p_admin_user_id: ctx.user.id,
    });
    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      return jsonNoStore({ error: "Unable to load structure management." }, 500);
    }
    return jsonNoStore(data ?? { artisans: [], crafts: [], countries: [], history: [] });
  } catch {
    return jsonNoStore({ error: "Structure management service is unavailable." }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin structure changes are not allowed." }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid craft request." }, 400);
  }

  if (body.target !== "craft") return jsonNoStore({ error: "Invalid structure target." }, 422);
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const nameAr = cleanText(body.nameAr, 1, 120);
  const nameEn = cleanText(body.nameEn, 1, 120);
  const icon = body.icon === undefined || body.icon === null || body.icon === "" ? null : cleanText(body.icon, 1, 32);
  const reason = parseReason(body.reason);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80 || !nameAr || !nameEn || (body.icon && !icon) || (body.reason && !reason)) {
    return jsonNoStore({ error: "Craft details are invalid." }, 422);
  }

  try {
    const ctx = await getContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
    const { data, error } = await ctx.admin.rpc("create_admin_craft", {
      p_slug: slug,
      p_name_ar: nameAr,
      p_name_en: nameEn,
      p_icon: icon,
      p_admin_user_id: ctx.user.id,
      p_reason: reason,
    });

    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      if (error.message.includes("craft_slug_exists")) return jsonNoStore({ error: "A craft with this slug already exists." }, 409);
      return jsonNoStore({ error: "Unable to create craft." }, 500);
    }
    return jsonNoStore({ ok: true, id: data });
  } catch {
    return jsonNoStore({ error: "Structure management service is unavailable." }, 503);
  }
}

export async function PUT(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin structure changes are not allowed." }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid craft request." }, 400);
  }

  const nameAr = cleanText(body.nameAr, 1, 120);
  const nameEn = cleanText(body.nameEn, 1, 120);
  const icon = body.icon === undefined || body.icon === null || body.icon === "" ? null : cleanText(body.icon, 1, 32);
  const reason = parseReason(body.reason);
  if (body.target !== "craft" || !isUuid(body.id) || !nameAr || !nameEn || (body.icon && !icon) || (body.reason && !reason)) {
    return jsonNoStore({ error: "Craft details are invalid." }, 422);
  }

  try {
    const ctx = await getContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
    const { error } = await ctx.admin.rpc("update_admin_craft", {
      p_craft_id: body.id,
      p_name_ar: nameAr,
      p_name_en: nameEn,
      p_icon: icon,
      p_admin_user_id: ctx.user.id,
      p_reason: reason,
    });
    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      if (error.message.includes("craft_not_found")) return jsonNoStore({ error: "Craft not found." }, 404);
      return jsonNoStore({ error: "Unable to update craft." }, 500);
    }
    return jsonNoStore({ ok: true });
  } catch {
    return jsonNoStore({ error: "Structure management service is unavailable." }, 503);
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin structure changes are not allowed." }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid craft request." }, 400);
  }

  const reason = parseReason(body.reason);
  if (body.target !== "craft" || !isUuid(body.id) || (body.reason && !reason)) {
    return jsonNoStore({ error: "Craft details are invalid." }, 422);
  }

  try {
    const ctx = await getContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
    const { error } = await ctx.admin.rpc("delete_admin_unused_craft", {
      p_craft_id: body.id,
      p_admin_user_id: ctx.user.id,
      p_reason: reason,
    });
    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      if (error.message.includes("craft_has_history")) return jsonNoStore({ error: "This craft has marketplace history and cannot be deleted. Deactivate it instead." }, 409);
      if (error.message.includes("craft_not_found")) return jsonNoStore({ error: "Craft not found." }, 404);
      return jsonNoStore({ error: "Unable to delete craft." }, 500);
    }
    return jsonNoStore({ ok: true });
  } catch {
    return jsonNoStore({ error: "Structure management service is unavailable." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin structure changes are not allowed." }, 403);
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid structure request." }, 400);
  }

  const target = body.target;
  if (!isUuid(body.id) || !["artisan", "craft", "country"].includes(String(target))) {
    return jsonNoStore({ error: "Invalid structure target." }, 422);
  }
  const reason = parseReason(body.reason);
  if (body.reason && !reason) return jsonNoStore({ error: "Reason is invalid or too long." }, 422);

  try {
    const ctx = await getContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
    let error;
    if (target === "artisan") {
      const status = typeof body.status === "string" ? body.status : "";
      if (!["pending_verification", "active", "under_review", "suspended", "deactivated"].includes(status)) return jsonNoStore({ error: "Invalid Artisan status." }, 422);
      ({ error } = await ctx.admin.rpc("set_admin_artisan_status", {
        p_artisan_id: body.id,
        p_status: status,
        p_admin_user_id: ctx.user.id,
        p_reason: reason,
      }));
    } else {
      if (typeof body.active !== "boolean") return jsonNoStore({ error: "Active state is required." }, 422);
      ({ error } = await ctx.admin.rpc(target === "craft" ? "set_admin_craft_active" : "set_admin_country_active", target === "craft" ? {
        p_craft_id: body.id,
        p_active: body.active,
        p_admin_user_id: ctx.user.id,
        p_reason: reason,
      } : {
        p_country_id: body.id,
        p_active: body.active,
        p_admin_user_id: ctx.user.id,
        p_reason: reason,
      }));
    }

    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      if (error.message.includes("craft_in_use")) return jsonNoStore({ error: "This craft cannot be deactivated while it has active Artisans or published products." }, 409);
      if (error.message.includes("country_in_use")) return jsonNoStore({ error: "This country cannot be deactivated while it has an active market or active Artisans." }, 409);
      if (error.message.includes("not_found")) return jsonNoStore({ error: "Structure record not found." }, 404);
      return jsonNoStore({ error: "Unable to update structure record." }, 500);
    }
    return jsonNoStore({ ok: true });
  } catch {
    return jsonNoStore({ error: "Structure management service is unavailable." }, 503);
  }
}

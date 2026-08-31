import { NextRequest } from "next/server";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { cleanText, isSameOriginMutation, isUuid, jsonNoStore } from "@/lib/serverApi";

export async function GET() {
  try {
    const ctx = await getPayoutServerContext();
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
  const reason = body.reason === undefined || body.reason === null || body.reason === "" ? null : cleanText(body.reason, 1, 1000);
  if (body.reason && !reason) return jsonNoStore({ error: "Reason is invalid or too long." }, 422);

  try {
    const ctx = await getPayoutServerContext();
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

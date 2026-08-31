import { NextRequest } from "next/server";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { cleanText, isSameOriginMutation, isUuid, jsonNoStore } from "@/lib/serverApi";

export async function GET() {
  try {
    const ctx = await getPayoutServerContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
    const { data, error } = await ctx.admin.rpc("get_admin_commission_configuration", {
      p_admin_user_id: ctx.user.id,
    });
    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      return jsonNoStore({ error: "Unable to load commission configuration." }, 500);
    }
    return jsonNoStore(data ?? { crafts: [], artisans: [], history: [] });
  } catch {
    return jsonNoStore({ error: "Commission configuration service is unavailable." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin commission changes are not allowed." }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid commission request." }, 400);
  }

  const target = body.target;
  const id = body.id;
  if ((target !== "craft" && target !== "artisan") || !isUuid(id)) {
    return jsonNoStore({ error: "Invalid commission target." }, 422);
  }

  const reason = body.reason === undefined || body.reason === null || body.reason === ""
    ? null
    : cleanText(body.reason, 1, 1000);
  if (body.reason && !reason) return jsonNoStore({ error: "Change reason is invalid or too long." }, 422);

  const clearOverride = target === "artisan" && body.ratePercent === null;
  const rate = typeof body.ratePercent === "number" && Number.isFinite(body.ratePercent)
    ? body.ratePercent
    : null;
  if (!clearOverride && (rate === null || rate < 0 || rate > 100)) {
    return jsonNoStore({ error: "Commission rate must be between 0 and 100." }, 422);
  }
  if (target === "craft" && rate === null) {
    return jsonNoStore({ error: "Craft commission rate is required." }, 422);
  }

  try {
    const ctx = await getPayoutServerContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

    let error;
    if (target === "craft") {
      ({ error } = await ctx.admin.rpc("set_admin_craft_commission_rate", {
        p_craft_id: id,
        p_rate_percent: rate,
        p_admin_user_id: ctx.user.id,
        p_reason: reason,
      }));
    } else if (clearOverride) {
      ({ error } = await ctx.admin.rpc("clear_admin_artisan_commission_override", {
        p_artisan_id: id,
        p_admin_user_id: ctx.user.id,
        p_reason: reason,
      }));
    } else {
      ({ error } = await ctx.admin.rpc("set_admin_artisan_commission_override", {
        p_artisan_id: id,
        p_rate_percent: rate,
        p_admin_user_id: ctx.user.id,
        p_reason: reason,
      }));
    }

    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      if (error.message.includes("invalid_commission_rate")) return jsonNoStore({ error: "Commission rate must be between 0 and 100." }, 422);
      if (error.message.includes("craft_not_found") || error.message.includes("artisan_not_found")) return jsonNoStore({ error: "Commission target was not found." }, 404);
      return jsonNoStore({ error: "Unable to update commission configuration." }, 500);
    }

    return jsonNoStore({ ok: true });
  } catch {
    return jsonNoStore({ error: "Commission configuration service is unavailable." }, 503);
  }
}

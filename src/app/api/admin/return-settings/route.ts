import { NextRequest } from "next/server";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { cleanText, isSameOriginMutation, isUuid, jsonNoStore } from "@/lib/serverApi";

export async function GET() {
  try {
    const ctx = await getPayoutServerContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
    const { data, error } = await ctx.admin.rpc("get_market_return_window_settings", {
      p_admin_user_id: ctx.user.id,
    });
    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      return jsonNoStore({ error: "Unable to load return settings." }, 500);
    }
    return jsonNoStore({ markets: Array.isArray(data) ? data : [] });
  } catch {
    return jsonNoStore({ error: "Return settings service is unavailable." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin settings changes are not allowed." }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid settings request." }, 400);
  }

  if (!isUuid(body.marketId)) return jsonNoStore({ error: "Invalid market." }, 400);
  const days = typeof body.days === "number" && Number.isInteger(body.days) && body.days >= 0 ? body.days : null;
  if (days === null) return jsonNoStore({ error: "Return window must be a whole number of days, zero or greater." }, 422);
  const reason = body.reason === undefined || body.reason === null || body.reason === "" ? null : cleanText(body.reason, 1, 1000);
  if (body.reason && !reason) return jsonNoStore({ error: "Reason is too long or invalid." }, 422);

  try {
    const ctx = await getPayoutServerContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
    const { data, error } = await ctx.admin.rpc("set_market_return_window_days", {
      p_market_id: body.marketId,
      p_days: days,
      p_admin_user_id: ctx.user.id,
      p_reason: reason,
    });
    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      if (error.message.includes("market_not_found")) return jsonNoStore({ error: "Market not found." }, 404);
      return jsonNoStore({ error: "Unable to update return window." }, 500);
    }
    return jsonNoStore({ marketId: body.marketId, returnWindowDays: data });
  } catch {
    return jsonNoStore({ error: "Return settings service is unavailable." }, 503);
  }
}

import { NextRequest } from "next/server";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { cleanText, isSameOriginMutation, isUuid, jsonNoStore } from "@/lib/serverApi";

export async function GET() {
  try {
    const ctx = await getPayoutServerContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

    const { data, error } = await ctx.admin.rpc("get_market_tax_settings", {
      p_admin_user_id: ctx.user.id,
    });

    if (error) {
      if (error.message.includes("admin_required")) {
        return jsonNoStore({ error: "Super Admin access required." }, 403);
      }
      return jsonNoStore({ error: "Unable to load tax settings." }, 500);
    }

    return jsonNoStore({ markets: Array.isArray(data) ? data : [] });
  } catch {
    return jsonNoStore({ error: "Tax settings service is unavailable." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore({ error: "Cross-origin settings changes are not allowed." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid settings request." }, 400);
  }

  if (!isUuid(body.marketId)) return jsonNoStore({ error: "Invalid market." }, 400);

  const rawRate = typeof body.ratePercent === "string"
    ? body.ratePercent.trim()
    : typeof body.ratePercent === "number"
      ? String(body.ratePercent)
      : "";

  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(rawRate)) {
    return jsonNoStore({ error: "Tax rate must have at most two decimal places." }, 422);
  }

  const ratePercent = Number(rawRate);
  if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) {
    return jsonNoStore({ error: "Tax rate must be between 0% and 100%." }, 422);
  }

  const reason = body.reason === undefined || body.reason === null || body.reason === ""
    ? null
    : cleanText(body.reason, 1, 1000);
  if (body.reason && !reason) {
    return jsonNoStore({ error: "Reason is too long or invalid." }, 422);
  }

  try {
    const ctx = await getPayoutServerContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

    const { data, error } = await ctx.admin.rpc("set_market_tax_rate", {
      p_market_id: body.marketId,
      p_rate_percent: ratePercent,
      p_admin_user_id: ctx.user.id,
      p_reason: reason,
    });

    if (error) {
      if (error.message.includes("admin_required")) {
        return jsonNoStore({ error: "Super Admin access required." }, 403);
      }
      if (error.message.includes("market_not_found")) {
        return jsonNoStore({ error: "Market not found." }, 404);
      }
      if (error.message.includes("invalid_tax_rate")) {
        return jsonNoStore({ error: "Invalid tax rate." }, 422);
      }
      return jsonNoStore({ error: "Unable to update tax rate." }, 500);
    }

    return jsonNoStore({ marketId: body.marketId, taxRatePercent: String(data) });
  } catch {
    return jsonNoStore({ error: "Tax settings service is unavailable." }, 503);
  }
}

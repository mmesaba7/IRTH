import { NextRequest } from "next/server";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { cleanText, isSameOriginMutation, isUuid, jsonNoStore } from "@/lib/serverApi";

export async function GET(request: NextRequest) {
  const includeClosed = request.nextUrl.searchParams.get("includeClosed") === "true";
  try {
    const ctx = await getPayoutServerContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
    const { data, error } = await ctx.admin.rpc("get_wholesale_requests_for_admin", {
      p_admin_user_id: ctx.user.id,
      p_include_closed: includeClosed,
    });
    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      return jsonNoStore({ error: "Unable to load wholesale requests." }, 500);
    }
    return jsonNoStore({ requests: Array.isArray(data) ? data : [] });
  } catch {
    return jsonNoStore({ error: "Wholesale administration is unavailable." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin admin changes are not allowed." }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid wholesale admin request." }, 400);
  }

  if (!isUuid(body.requestId) || typeof body.closed !== "boolean") {
    return jsonNoStore({ error: "Invalid wholesale admin request." }, 422);
  }
  const note = body.adminNote === undefined || body.adminNote === null || body.adminNote === "" ? null : cleanText(body.adminNote, 1, 4000);
  if (body.adminNote && !note) return jsonNoStore({ error: "Admin note is too long or invalid." }, 422);

  try {
    const ctx = await getPayoutServerContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
    const { error } = await ctx.admin.rpc("set_wholesale_request_closed", {
      p_request_id: body.requestId,
      p_admin_user_id: ctx.user.id,
      p_closed: body.closed,
      p_admin_note: note,
    });
    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      if (error.message.includes("wholesale_request_not_found")) return jsonNoStore({ error: "Wholesale request not found." }, 404);
      return jsonNoStore({ error: "Unable to update wholesale request." }, 500);
    }
    return jsonNoStore({ ok: true });
  } catch {
    return jsonNoStore({ error: "Wholesale administration is unavailable." }, 503);
  }
}

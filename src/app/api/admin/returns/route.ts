import { NextRequest } from "next/server";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { cleanText, isSameOriginMutation, isUuid, jsonNoStore } from "@/lib/serverApi";

function parseInspectionItems(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) return null;
  const items: Array<{ returnItemId: string; restockableQuantity: number }> = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const row = raw as Record<string, unknown>;
    if (!isUuid(row.returnItemId) || !Number.isInteger(row.restockableQuantity) || Number(row.restockableQuantity) < 0) return null;
    items.push({ returnItemId: row.returnItemId, restockableQuantity: Number(row.restockableQuantity) });
  }
  return items;
}

export async function GET() {
  try {
    const ctx = await getPayoutServerContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
    const { data, error } = await ctx.admin.rpc("get_admin_return_requests", {
      p_admin_user_id: ctx.user.id,
    });
    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      return jsonNoStore({ error: "Unable to load return requests." }, 500);
    }
    return jsonNoStore({ requests: Array.isArray(data) ? data : [] });
  } catch {
    return jsonNoStore({ error: "Return administration is unavailable." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin return changes are not allowed." }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid return admin request." }, 400);
  }

  if (!isUuid(body.returnRequestId)) return jsonNoStore({ error: "Invalid return request." }, 422);
  const action = typeof body.action === "string" ? body.action : "";
  const note = body.note === undefined || body.note === null || body.note === "" ? null : cleanText(body.note, 1, 2000);
  if (body.note && !note) return jsonNoStore({ error: "Admin note is invalid or too long." }, 422);

  try {
    const ctx = await getPayoutServerContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

    let error;
    let data;
    if (action === "approve" || action === "reject") {
      ({ data, error } = await ctx.admin.rpc("admin_review_return_request", {
        p_return_request_id: body.returnRequestId,
        p_admin_user_id: ctx.user.id,
        p_decision: action === "approve" ? "approved" : "rejected",
        p_note: note,
      }));
    } else if (action === "received") {
      ({ data, error } = await ctx.admin.rpc("admin_mark_return_received", {
        p_return_request_id: body.returnRequestId,
        p_admin_user_id: ctx.user.id,
      }));
    } else if (action === "inspect") {
      const items = parseInspectionItems(body.items);
      if (!items) return jsonNoStore({ error: "Inspection must include valid restockable quantities for every item." }, 422);
      ({ data, error } = await ctx.admin.rpc("admin_inspect_return_request", {
        p_return_request_id: body.returnRequestId,
        p_admin_user_id: ctx.user.id,
        p_items: items,
        p_note: note,
      }));
    } else if (action === "prepare_refund") {
      ({ data, error } = await ctx.admin.rpc("admin_prepare_return_refund", {
        p_return_request_id: body.returnRequestId,
        p_admin_user_id: ctx.user.id,
      }));
    } else {
      return jsonNoStore({ error: "Invalid return action." }, 422);
    }

    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      if (error.message.includes("return_request_not_found")) return jsonNoStore({ error: "Return request not found." }, 404);
      if (error.message.includes("invalid_return_review_state") || error.message.includes("invalid_return_receive_state") || error.message.includes("invalid_return_inspection_state") || error.message.includes("return_must_be_inspected_before_refund")) {
        return jsonNoStore({ error: "This return is no longer in the required state for that action." }, 409);
      }
      if (error.message.includes("inspection_must_cover_all_return_items") || error.message.includes("invalid_inspection_item")) {
        return jsonNoStore({ error: "Inspection must cover every return item with a valid restockable quantity." }, 422);
      }
      if (error.message.includes("payment_must_be_collected_before_refund")) {
        return jsonNoStore({ error: "Refund cannot be prepared until payment is recorded as collected." }, 409);
      }
      return jsonNoStore({ error: "Unable to update return request." }, 500);
    }

    return jsonNoStore({ ok: true, result: data });
  } catch {
    return jsonNoStore({ error: "Return administration is unavailable." }, 503);
  }
}

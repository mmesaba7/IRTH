import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanText, hashOpaqueToken, isSameOriginMutation, isUuid, jsonNoStore, parseGuestToken } from "@/lib/serverApi";

function parseItems(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) return null;
  const items: Array<{ orderItemId: string; quantity: number; reason: string }> = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const row = raw as Record<string, unknown>;
    if (!isUuid(row.orderItemId) || !Number.isInteger(row.quantity) || Number(row.quantity) <= 0) return null;
    const reason = cleanText(row.reason, 3, 1000);
    if (!reason) return null;
    items.push({ orderItemId: row.orderItemId, quantity: Number(row.quantity), reason });
  }
  return items;
}

function mapReturnError(message: string) {
  if (message.includes("return_window_closed")) return [409, "The return window for this item has ended."] as const;
  if (message.includes("return_quantity_exceeds_available")) return [409, "The requested return quantity is no longer available."] as const;
  if (message.includes("return_item_not_in_order") || message.includes("order_not_found")) return [404, "Order item was not found."] as const;
  if (message.includes("return_order_access_denied")) return [403, "Return access denied."] as const;
  return [500, "Unable to create return request."] as const;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin guest return requests are not allowed." }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid guest return request." }, 400);
  }

  if (!isUuid(body.orderId)) return jsonNoStore({ error: "Invalid order." }, 400);
  const token = parseGuestToken(body.token);
  if (!token) return jsonNoStore({ error: "Secure guest access is required." }, 401);
  const tokenHash = hashOpaqueToken(token);
  const action = body.action === "context" ? "context" : body.action === "create" ? "create" : null;
  if (!action) return jsonNoStore({ error: "Invalid guest return action." }, 422);

  try {
    const admin = createAdminClient();
    if (action === "context") {
      const { data, error } = await admin.rpc("get_return_order_context", {
        p_order_id: body.orderId,
        p_customer_user_id: null,
        p_guest_access_token_hash: tokenHash,
      });
      if (error) return jsonNoStore({ error: "Unable to load return context." }, 500);
      if (!data) return jsonNoStore({ error: "Secure guest order not found." }, 404);
      return jsonNoStore({ context: data });
    }

    const items = parseItems(body.items);
    if (!items) return jsonNoStore({ error: "Choose valid return items, quantities, and a reason." }, 422);
    const { data, error } = await admin.rpc("create_guest_return_request", {
      p_order_id: body.orderId,
      p_guest_access_token_hash: tokenHash,
      p_items: items,
    });
    if (error) {
      const [status, message] = mapReturnError(error.message);
      return jsonNoStore({ error: message }, status);
    }
    return jsonNoStore({ returnRequestId: data, status: "requested" }, 201);
  } catch {
    return jsonNoStore({ error: "Guest return service is unavailable." }, 503);
  }
}

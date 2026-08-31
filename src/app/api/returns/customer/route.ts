import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanText, isSameOriginMutation, isUuid, jsonNoStore } from "@/lib/serverApi";

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

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
  if (message.includes("cancelled_order_not_returnable")) return [409, "Cancelled orders cannot be returned."] as const;
  return [500, "Unable to create return request."] as const;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await currentUserId();
    if (!userId) return jsonNoStore({ error: "Authentication required." }, 401);
    const admin = createAdminClient();
    const orderId = request.nextUrl.searchParams.get("orderId");

    if (orderId) {
      if (!isUuid(orderId)) return jsonNoStore({ error: "Invalid order." }, 400);
      const { data, error } = await admin.rpc("get_return_order_context", {
        p_order_id: orderId,
        p_customer_user_id: userId,
        p_guest_access_token_hash: null,
      });
      if (error) return jsonNoStore({ error: "Unable to load return context." }, 500);
      if (!data) return jsonNoStore({ error: "Order not found for this customer." }, 404);
      return jsonNoStore({ context: data });
    }

    const { data, error } = await admin.rpc("get_customer_return_requests", {
      p_customer_user_id: userId,
    });
    if (error) return jsonNoStore({ error: "Unable to load return requests." }, 500);
    return jsonNoStore({ requests: Array.isArray(data) ? data : [] });
  } catch {
    return jsonNoStore({ error: "Return service is unavailable." }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin return requests are not allowed." }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid return request." }, 400);
  }

  if (!isUuid(body.orderId)) return jsonNoStore({ error: "Invalid order." }, 400);
  const items = parseItems(body.items);
  if (!items) return jsonNoStore({ error: "Choose valid return items, quantities, and a reason." }, 422);

  try {
    const userId = await currentUserId();
    if (!userId) return jsonNoStore({ error: "Authentication required." }, 401);
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("create_customer_return_request", {
      p_order_id: body.orderId,
      p_customer_user_id: userId,
      p_items: items,
    });
    if (error) {
      const [status, message] = mapReturnError(error.message);
      return jsonNoStore({ error: message }, status);
    }
    return jsonNoStore({ returnRequestId: data, status: "requested" }, 201);
  } catch {
    return jsonNoStore({ error: "Return service is unavailable." }, 503);
  }
}

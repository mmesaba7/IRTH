import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanText, isSameOriginMutation, isUuid, jsonNoStore } from "@/lib/serverApi";

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function mapCancellationError(message: string) {
  if (message.includes("cancellation_order_access_denied")) return [403, "Cancellation access denied."] as const;
  if (message.includes("cancellation_unavailable_after_courier")) return [409, "Cancellation is no longer available after courier pickup. Use the return/refusal flow instead."] as const;
  if (message.includes("cod_cancellation_beta_only")) return [409, "This cancellation path currently supports COD orders only."] as const;
  if (message.includes("pending_cod_payment_required")) return [409, "The current payment state does not allow cancellation here."] as const;
  if (message.includes("cancellation_state_not_allowed")) return [409, "The current order state does not allow cancellation."] as const;
  if (message.includes("order_not_found")) return [404, "Order was not found."] as const;
  return [500, "Unable to process cancellation right now."] as const;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await currentUserId();
    if (!userId) return jsonNoStore({ error: "Authentication required." }, 401);
    const orderId = request.nextUrl.searchParams.get("orderId");
    if (!orderId || !isUuid(orderId)) return jsonNoStore({ error: "Invalid order." }, 400);

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_order_cancellation_context", {
      p_order_id: orderId,
      p_customer_user_id: userId,
      p_guest_access_token_hash: null,
    });
    if (error) return jsonNoStore({ error: "Unable to load cancellation options." }, 500);
    if (!data) return jsonNoStore({ error: "Order not found for this customer." }, 404);
    return jsonNoStore({ context: data });
  } catch {
    return jsonNoStore({ error: "Cancellation service is unavailable." }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore({ error: "Cross-origin cancellation requests are not allowed." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid cancellation request." }, 400);
  }

  if (!isUuid(body.orderId)) return jsonNoStore({ error: "Invalid order." }, 400);
  const reason = cleanText(body.reason, 3, 1000);
  if (!reason) return jsonNoStore({ error: "Write a short cancellation reason." }, 422);

  try {
    const userId = await currentUserId();
    if (!userId) return jsonNoStore({ error: "Authentication required." }, 401);

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("create_customer_order_cancellation_request", {
      p_order_id: body.orderId,
      p_customer_user_id: userId,
      p_reason: reason,
    });
    if (error) {
      const [status, message] = mapCancellationError(error.message);
      return jsonNoStore({ error: message }, status);
    }

    return jsonNoStore({ result: data }, 201);
  } catch {
    return jsonNoStore({ error: "Cancellation service is unavailable." }, 503);
  }
}

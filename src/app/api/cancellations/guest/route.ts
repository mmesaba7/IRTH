import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cleanText,
  hashOpaqueToken,
  isSameOriginMutation,
  isUuid,
  jsonNoStore,
  parseGuestToken,
} from "@/lib/serverApi";

function mapCancellationError(message: string) {
  if (message.includes("cancellation_order_access_denied")) return [403, "Cancellation access denied."] as const;
  if (message.includes("cancellation_unavailable_after_courier")) return [409, "Cancellation is no longer available after courier pickup. Use the return/refusal flow instead."] as const;
  if (message.includes("cod_cancellation_beta_only")) return [409, "This cancellation path currently supports COD orders only."] as const;
  if (message.includes("pending_cod_payment_required")) return [409, "The current payment state does not allow cancellation here."] as const;
  if (message.includes("cancellation_state_not_allowed")) return [409, "The current order state does not allow cancellation."] as const;
  if (message.includes("order_not_found")) return [404, "Order was not found."] as const;
  return [500, "Unable to process cancellation right now."] as const;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore({ error: "Cross-origin guest cancellation requests are not allowed." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid guest cancellation request." }, 400);
  }

  if (!isUuid(body.orderId)) return jsonNoStore({ error: "Invalid order." }, 400);
  const token = parseGuestToken(body.token);
  if (!token) return jsonNoStore({ error: "Secure guest access is required." }, 401);
  const tokenHash = hashOpaqueToken(token);
  const action = body.action === "context" ? "context" : body.action === "create" ? "create" : null;
  if (!action) return jsonNoStore({ error: "Invalid cancellation action." }, 422);

  try {
    const admin = createAdminClient();

    if (action === "context") {
      const { data, error } = await admin.rpc("get_order_cancellation_context", {
        p_order_id: body.orderId,
        p_customer_user_id: null,
        p_guest_access_token_hash: tokenHash,
      });
      if (error) return jsonNoStore({ error: "Unable to load cancellation options." }, 500);
      if (!data) return jsonNoStore({ error: "Secure guest order not found." }, 404);
      return jsonNoStore({ context: data });
    }

    const reason = cleanText(body.reason, 3, 1000);
    if (!reason) return jsonNoStore({ error: "Write a short cancellation reason." }, 422);

    const { data, error } = await admin.rpc("create_guest_order_cancellation_request", {
      p_order_id: body.orderId,
      p_guest_access_token_hash: tokenHash,
      p_reason: reason,
    });
    if (error) {
      const [status, message] = mapCancellationError(error.message);
      return jsonNoStore({ error: message }, status);
    }

    return jsonNoStore({ result: data }, 201);
  } catch {
    return jsonNoStore({ error: "Guest cancellation service is unavailable." }, 503);
  }
}

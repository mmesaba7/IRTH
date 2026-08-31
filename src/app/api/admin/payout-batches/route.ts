import { NextRequest, NextResponse } from "next/server";
import {
  getPayoutServerContext,
  isSameOriginMutation,
  isUuid,
} from "@/lib/payouts/server";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore(
      { error: "Cross-origin payout requests are not allowed" },
      403
    );
  }

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
    return jsonNoStore({ error: "A valid Idempotency-Key is required" }, 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: "Invalid request body" }, 400);
  }

  if (typeof body !== "object" || body === null) {
    return jsonNoStore({ error: "Invalid request body" }, 400);
  }

  const rawItems = (body as { orderItemIds?: unknown }).orderItemIds;
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 500) {
    return jsonNoStore({ error: "Select between 1 and 500 payout items" }, 422);
  }

  const orderItemIds = rawItems.filter(isUuid);
  if (
    orderItemIds.length !== rawItems.length ||
    new Set(orderItemIds).size !== orderItemIds.length
  ) {
    return jsonNoStore({ error: "Invalid or duplicate payout items" }, 422);
  }

  try {
    const context = await getPayoutServerContext();
    if (!context) return jsonNoStore({ error: "Authentication required" }, 401);

    const { data, error } = await context.admin.rpc("create_manual_payout_batch", {
      p_order_item_ids: orderItemIds,
      p_admin_user_id: context.user.id,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      const message = error.message;
      if (message.includes("admin_required")) {
        return jsonNoStore({ error: "Super Admin access required" }, 403);
      }
      if (
        message.includes("payout_item_not_eligible") ||
        message.includes("payout_item_already_reserved") ||
        message.includes("active_verified_payout_account_required") ||
        message.includes("payout_batch_currency_mismatch") ||
        message.includes("payout_idempotency_key_reused_with_different_items")
      ) {
        return jsonNoStore(
          { error: "Selected payout items changed or cannot be paid together. Refresh and review the selection." },
          409
        );
      }
      return jsonNoStore({ error: "Unable to create payout batch" }, 500);
    }

    const result = Array.isArray(data) ? data[0] : null;
    if (!result?.batch_id || !result?.batch_number) {
      return jsonNoStore({ error: "Unable to create payout batch" }, 500);
    }

    return jsonNoStore(
      {
        batch: {
          id: result.batch_id,
          batchNumber: result.batch_number,
          totalAmount: result.total_amount,
          itemCount: result.item_count,
          changed: Boolean(result.changed),
        },
      },
      result.changed ? 201 : 200
    );
  } catch {
    console.error("Unable to create manual payout batch");
    return jsonNoStore({ error: "Unable to create payout batch" }, 500);
  }
}

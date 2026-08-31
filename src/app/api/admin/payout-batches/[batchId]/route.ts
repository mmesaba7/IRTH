import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { decryptPayoutDetails } from "@/lib/payouts/crypto";
import {
  getPayoutServerContext,
  isSameOriginMutation,
  isSameOriginSensitiveRead,
  isUuid,
  safeMessage,
} from "@/lib/payouts/server";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null
      )
    : [];
}

async function loadBatchDetail(
  batchId: string,
  adminUserId: string,
  admin: SupabaseClient
) {
  const [batchResult, itemsResult] = await Promise.all([
    admin.rpc("get_payout_batches_for_admin", {
      p_admin_user_id: adminUserId,
      p_batch_id: batchId,
    }),
    admin.rpc("get_payout_batch_items_for_admin", {
      p_admin_user_id: adminUserId,
      p_batch_id: batchId,
    }),
  ]);

  return { batchResult, itemsResult };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ batchId: string }> }
) {
  if (!isSameOriginSensitiveRead(request)) {
    return jsonNoStore({ error: "Sensitive payout reads require same-origin access" }, 403);
  }

  const { batchId } = await context.params;
  if (!isUuid(batchId)) return jsonNoStore({ error: "Invalid payout batch" }, 400);

  try {
    const requestContext = await getPayoutServerContext();
    if (!requestContext) return jsonNoStore({ error: "Authentication required" }, 401);

    const { batchResult, itemsResult } = await loadBatchDetail(
      batchId,
      requestContext.user.id,
      requestContext.admin
    );

    const firstError = batchResult.error ?? itemsResult.error;
    if (firstError) {
      if (firstError.message.includes("admin_required")) {
        return jsonNoStore({ error: "Super Admin access required" }, 403);
      }
      return jsonNoStore({ error: "Unable to load payout batch" }, 500);
    }

    const batch = rows(batchResult.data)[0] ?? null;
    if (!batch) return jsonNoStore({ error: "Payout batch not found" }, 404);

    const itemRows = rows(itemsResult.data);
    const artisanIds = Array.from(
      new Set(
        itemRows
          .map((item) => item.artisan_id)
          .filter((value): value is string => typeof value === "string")
      )
    );
    const orderItemIds = itemRows
      .map((item) => item.order_item_id)
      .filter((value): value is string => typeof value === "string");

    const [artisanResult, orderItemsResult] = await Promise.all([
      artisanIds.length
        ? requestContext.admin
            .from("artisan_profiles")
            .select("id, slug, name_ar, name_en")
            .in("id", artisanIds)
        : Promise.resolve({ data: [], error: null }),
      orderItemIds.length
        ? requestContext.admin
            .from("order_items")
            .select("id, order_id")
            .in("id", orderItemIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (artisanResult.error || orderItemsResult.error) {
      return jsonNoStore({ error: "Unable to load payout batch references" }, 500);
    }

    const artisanMap = new Map(
      (artisanResult.data ?? []).map((artisan) => [artisan.id, artisan])
    );
    const orderIds = Array.from(
      new Set((orderItemsResult.data ?? []).map((item) => item.order_id))
    );
    const ordersResult = orderIds.length
      ? await requestContext.admin
          .from("orders")
          .select("id, order_number")
          .in("id", orderIds)
      : { data: [], error: null };

    if (ordersResult.error) {
      return jsonNoStore({ error: "Unable to load payout order references" }, 500);
    }

    const orderItemMap = new Map(
      (orderItemsResult.data ?? []).map((item) => [item.id, item.order_id])
    );
    const orderMap = new Map(
      (ordersResult.data ?? []).map((order) => [order.id, order.order_number])
    );

    const items = itemRows.map((item) => {
      const details = decryptPayoutDetails(
        String(item.account_details_ciphertext ?? ""),
        Number(item.account_encryption_key_version ?? 0)
      );
      const artisan = artisanMap.get(String(item.artisan_id ?? ""));
      const orderId = orderItemMap.get(String(item.order_item_id ?? ""));

      return {
        id: item.payout_batch_item_id,
        orderItemId: item.order_item_id,
        orderId: orderId ?? null,
        orderNumber: orderId ? orderMap.get(orderId) ?? null : null,
        artisanId: item.artisan_id,
        artisanName:
          artisan?.name_ar || artisan?.name_en || artisan?.slug || "Artisan",
        payoutAccountId: item.payout_account_id,
        amount: item.amount,
        currencyCode: item.currency_code,
        status: item.status,
        bankDetails: details,
      };
    });

    return jsonNoStore({
      batch: {
        id: batch.batch_id,
        batchNumber: batch.batch_number,
        status: batch.status,
        method: batch.method,
        currencyCode: batch.currency_code,
        totalAmount: batch.total_amount,
        itemCount: batch.item_count,
        createdAt: batch.created_at,
        paidAt: batch.paid_at,
        bankReference: batch.bank_reference,
        cancelledAt: batch.cancelled_at,
        cancelReason: batch.cancel_reason,
      },
      items,
    });
  } catch (error) {
    const message = safeMessage(error);
    if (
      message.includes("payout encryption") ||
      message.includes("payout ciphertext") ||
      message.includes("decrypt payout")
    ) {
      return jsonNoStore(
        { error: "Secure payout details are unavailable", code: "payout_encryption_unavailable" },
        503
      );
    }
    console.error("Unable to load payout batch detail");
    return jsonNoStore({ error: "Unable to load payout batch" }, 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ batchId: string }> }
) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore({ error: "Cross-origin payout requests are not allowed" }, 403);
  }

  const { batchId } = await context.params;
  if (!isUuid(batchId)) return jsonNoStore({ error: "Invalid payout batch" }, 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: "Invalid request body" }, 400);
  }
  if (typeof body !== "object" || body === null) {
    return jsonNoStore({ error: "Invalid request body" }, 400);
  }

  const source = body as Record<string, unknown>;
  const action = source.action;
  if (action !== "paid" && action !== "cancel") {
    return jsonNoStore({ error: "Invalid payout batch action" }, 422);
  }

  try {
    const requestContext = await getPayoutServerContext();
    if (!requestContext) return jsonNoStore({ error: "Authentication required" }, 401);

    if (action === "paid") {
      const bankReference =
        typeof source.bankReference === "string" ? source.bankReference.trim() : "";
      if (bankReference.length < 3 || bankReference.length > 200) {
        return jsonNoStore({ error: "Enter a valid bank transfer reference" }, 422);
      }

      const detail = await loadBatchDetail(
        batchId,
        requestContext.user.id,
        requestContext.admin
      );
      const firstError = detail.batchResult.error ?? detail.itemsResult.error;
      if (firstError) {
        if (firstError.message.includes("admin_required")) {
          return jsonNoStore({ error: "Super Admin access required" }, 403);
        }
        return jsonNoStore({ error: "Unable to verify payout batch" }, 500);
      }

      const itemRows = rows(detail.itemsResult.data);
      if (itemRows.length === 0) {
        return jsonNoStore({ error: "Payout batch has no payable items" }, 409);
      }
      for (const item of itemRows) {
        decryptPayoutDetails(
          String(item.account_details_ciphertext ?? ""),
          Number(item.account_encryption_key_version ?? 0)
        );
      }

      const { data, error } = await requestContext.admin.rpc(
        "record_manual_payout_batch_paid",
        {
          p_batch_id: batchId,
          p_admin_user_id: requestContext.user.id,
          p_bank_reference: bankReference,
        }
      );

      if (error) {
        if (error.message.includes("admin_required")) {
          return jsonNoStore({ error: "Super Admin access required" }, 403);
        }
        if (
          error.message.includes("payout_item_no_longer_eligible") ||
          error.message.includes("payout_item_balance_changed_rebuild_batch") ||
          error.message.includes("payout_batch_not_payable")
        ) {
          return jsonNoStore(
            { error: "The payout batch changed and must be reviewed or rebuilt before recording payment." },
            409
          );
        }
        if (error.message.includes("payout_reference_mismatch")) {
          return jsonNoStore({ error: "This batch was already recorded with a different bank reference" }, 409);
        }
        return jsonNoStore({ error: "Unable to record payout payment" }, 500);
      }

      const result = Array.isArray(data) ? data[0] : null;
      return jsonNoStore({
        batch: {
          id: result?.batch_id ?? batchId,
          status: result?.status ?? "paid",
          totalAmount: result?.total_amount ?? null,
          changed: Boolean(result?.changed),
        },
      });
    }

    const reason = typeof source.reason === "string" ? source.reason.trim() : "";
    if (reason.length < 3 || reason.length > 2000) {
      return jsonNoStore({ error: "Enter a valid cancellation reason" }, 422);
    }

    const { data, error } = await requestContext.admin.rpc(
      "cancel_manual_payout_batch",
      {
        p_batch_id: batchId,
        p_admin_user_id: requestContext.user.id,
        p_reason: reason,
      }
    );

    if (error) {
      if (error.message.includes("admin_required")) {
        return jsonNoStore({ error: "Super Admin access required" }, 403);
      }
      if (error.message.includes("paid_payout_batch_cannot_be_cancelled")) {
        return jsonNoStore({ error: "A paid payout batch cannot be cancelled" }, 409);
      }
      return jsonNoStore({ error: "Unable to cancel payout batch" }, 500);
    }

    const result = Array.isArray(data) ? data[0] : null;
    return jsonNoStore({
      batch: {
        id: result?.batch_id ?? batchId,
        status: result?.status ?? "cancelled",
        changed: Boolean(result?.changed),
      },
    });
  } catch (error) {
    const message = safeMessage(error);
    if (
      message.includes("payout encryption") ||
      message.includes("payout ciphertext") ||
      message.includes("decrypt payout")
    ) {
      return jsonNoStore(
        {
          error:
            "Secure payout decryption is unavailable. The paid state was not recorded.",
          code: "payout_encryption_unavailable",
        },
        503
      );
    }
    console.error("Unable to update payout batch");
    return jsonNoStore({ error: "Unable to update payout batch" }, 500);
  }
}

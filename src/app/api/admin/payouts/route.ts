import { NextResponse } from "next/server";
import {
  decryptPayoutDetails,
  maskSensitiveValue,
} from "@/lib/payouts/crypto";
import { getPayoutServerContext, safeMessage } from "@/lib/payouts/server";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
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

export async function GET() {
  try {
    const context = await getPayoutServerContext();
    if (!context) return jsonNoStore({ error: "Authentication required" }, 401);

    const [accountsResult, availabilityResult, batchesResult] = await Promise.all([
      context.admin.rpc("get_payout_accounts_for_admin", {
        p_admin_user_id: context.user.id,
        p_artisan_id: null,
      }),
      context.admin.rpc("get_payout_availability_for_admin", {
        p_admin_user_id: context.user.id,
        p_artisan_id: null,
      }),
      context.admin.rpc("get_payout_batches_for_admin", {
        p_admin_user_id: context.user.id,
        p_batch_id: null,
      }),
    ]);

    const firstError =
      accountsResult.error ?? availabilityResult.error ?? batchesResult.error;
    if (firstError) {
      if (firstError.message.includes("admin_required")) {
        return jsonNoStore({ error: "Super Admin access required" }, 403);
      }
      return jsonNoStore({ error: "Unable to load payout administration" }, 500);
    }

    // The overview only needs current operational accounts. Historical rejected or
    // superseded ciphertext is intentionally not decrypted on routine dashboard loads.
    const accountRows = rows(accountsResult.data).filter(
      (row) =>
        row.status === "pending_verification" || row.status === "active"
    );
    const availabilityRows = rows(availabilityResult.data);
    const batchRows = rows(batchesResult.data);

    const artisanIds = Array.from(
      new Set(
        [...accountRows, ...availabilityRows]
          .map((row) => row.artisan_id)
          .filter((value): value is string => typeof value === "string")
      )
    );
    const orderIds = Array.from(
      new Set(
        availabilityRows
          .map((row) => row.order_id)
          .filter((value): value is string => typeof value === "string")
      )
    );

    const [artisanLookup, orderLookup] = await Promise.all([
      artisanIds.length
        ? context.admin
            .from("artisan_profiles")
            .select("id, slug, name_ar, name_en")
            .in("id", artisanIds)
        : Promise.resolve({ data: [], error: null }),
      orderIds.length
        ? context.admin
            .from("orders")
            .select("id, order_number")
            .in("id", orderIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (artisanLookup.error || orderLookup.error) {
      return jsonNoStore({ error: "Unable to load payout references" }, 500);
    }

    const artisanMap = new Map(
      (artisanLookup.data ?? []).map((artisan) => [artisan.id, artisan])
    );
    const orderMap = new Map(
      (orderLookup.data ?? []).map((order) => [order.id, order.order_number])
    );

    const accounts = accountRows.map((row) => {
      const ciphertext = String(row.details_ciphertext ?? "");
      const keyVersion = Number(row.encryption_key_version ?? 0);
      const details = decryptPayoutDetails(ciphertext, keyVersion);
      const artisan = artisanMap.get(String(row.artisan_id ?? ""));

      return {
        id: row.payout_account_id,
        artisanId: row.artisan_id,
        artisanName:
          artisan?.name_ar || artisan?.name_en || artisan?.slug || "Artisan",
        artisanSlug: artisan?.slug ?? null,
        method: row.method,
        status: row.status,
        requestedAt: row.requested_at,
        reviewedAt: row.reviewed_at,
        activatedAt: row.activated_at,
        reviewNote: row.review_note,
        supersededByAccountId: row.superseded_by_account_id,
        bankName: details.bankName,
        accountHolder: details.accountHolder,
        accountNumberMasked: maskSensitiveValue(details.accountNumber),
        ibanMasked: details.iban ? maskSensitiveValue(details.iban) : null,
        swift: details.swift,
      };
    });

    const availability = availabilityRows.map((row) => {
      const artisan = artisanMap.get(String(row.artisan_id ?? ""));
      return {
        orderItemId: row.order_item_id,
        orderId: row.order_id,
        orderNumber: orderMap.get(String(row.order_id ?? "")) ?? null,
        artisanId: row.artisan_id,
        artisanName:
          artisan?.name_ar || artisan?.name_en || artisan?.slug || "Artisan",
        shipmentId: row.shipment_id,
        deliveredAt: row.delivered_at,
        holdEndsAt: row.hold_ends_at,
        paymentStatus: row.payment_status,
        currentSettlementAmount: row.current_settlement_amount,
        currencyCode: row.currency_code,
        eligibilityStatus: row.eligibility_status,
        payoutAvailabilityStatus: row.payout_availability_status,
        reservedPayoutBatchId: row.reserved_payout_batch_id,
      };
    });

    const batches = batchRows.map((row) => ({
      id: row.batch_id,
      batchNumber: row.batch_number,
      status: row.status,
      method: row.method,
      currencyCode: row.currency_code,
      totalAmount: row.total_amount,
      itemCount: row.item_count,
      createdAt: row.created_at,
      paidAt: row.paid_at,
      bankReference: row.bank_reference,
      cancelledAt: row.cancelled_at,
      cancelReason: row.cancel_reason,
    }));

    return jsonNoStore({ accounts, availability, batches });
  } catch (error) {
    const message = safeMessage(error);
    if (
      message.includes("Missing payout encryption key configuration") ||
      message.includes("Invalid payout encryption key configuration") ||
      message.includes("Unable to decrypt payout details") ||
      message.includes("Unsupported payout encryption key version")
    ) {
      return jsonNoStore(
        {
          error:
            "Secure payout decryption is unavailable. Sensitive payout data was not returned.",
          code: "payout_encryption_unavailable",
        },
        503
      );
    }
    console.error("Unable to load admin payout dashboard");
    return jsonNoStore({ error: "Unable to load payout administration" }, 500);
  }
}

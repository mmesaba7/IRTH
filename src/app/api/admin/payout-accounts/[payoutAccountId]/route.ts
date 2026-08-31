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

async function loadAccount(
  payoutAccountId: string,
  userId: string,
  admin: SupabaseClient
) {
  const { data, error } = await admin.rpc("get_payout_accounts_for_admin", {
    p_admin_user_id: userId,
    p_artisan_id: null,
  });

  if (error) return { error, account: null };
  const account =
    rows(data).find((row) => row.payout_account_id === payoutAccountId) ?? null;
  return { error: null, account };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ payoutAccountId: string }> }
) {
  if (!isSameOriginSensitiveRead(request)) {
    return jsonNoStore({ error: "Sensitive payout reads require same-origin access" }, 403);
  }

  const { payoutAccountId } = await context.params;
  if (!isUuid(payoutAccountId)) {
    return jsonNoStore({ error: "Invalid payout account" }, 400);
  }

  try {
    const requestContext = await getPayoutServerContext();
    if (!requestContext)
      return jsonNoStore({ error: "Authentication required" }, 401);

    const loaded = await loadAccount(
      payoutAccountId,
      requestContext.user.id,
      requestContext.admin
    );
    if (loaded.error) {
      if (loaded.error.message.includes("admin_required")) {
        return jsonNoStore({ error: "Super Admin access required" }, 403);
      }
      return jsonNoStore({ error: "Unable to load payout account" }, 500);
    }
    if (!loaded.account)
      return jsonNoStore({ error: "Payout account not found" }, 404);

    const details = decryptPayoutDetails(
      String(loaded.account.details_ciphertext ?? ""),
      Number(loaded.account.encryption_key_version ?? 0)
    );

    return jsonNoStore({
      payoutAccount: {
        id: loaded.account.payout_account_id,
        artisanId: loaded.account.artisan_id,
        method: loaded.account.method,
        status: loaded.account.status,
        requestedAt: loaded.account.requested_at,
        reviewedAt: loaded.account.reviewed_at,
        reviewNote: loaded.account.review_note,
        bankDetails: details,
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
          error: "Secure payout details are unavailable",
          code: "payout_encryption_unavailable",
        },
        503
      );
    }
    console.error("Unable to load payout account detail");
    return jsonNoStore({ error: "Unable to load payout account" }, 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ payoutAccountId: string }> }
) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore(
      { error: "Cross-origin payout requests are not allowed" },
      403
    );
  }

  const { payoutAccountId } = await context.params;
  if (!isUuid(payoutAccountId)) {
    return jsonNoStore({ error: "Invalid payout account" }, 400);
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

  const source = body as Record<string, unknown>;
  const decision = source.decision;
  if (decision !== "approved" && decision !== "rejected") {
    return jsonNoStore({ error: "Invalid payout account decision" }, 422);
  }

  const reviewNote =
    source.reviewNote === null || source.reviewNote === undefined
      ? null
      : typeof source.reviewNote === "string"
      ? source.reviewNote.trim()
      : undefined;
  if (
    reviewNote === undefined ||
    (reviewNote !== null && reviewNote.length > 2000)
  ) {
    return jsonNoStore({ error: "Invalid review note" }, 422);
  }

  try {
    const requestContext = await getPayoutServerContext();
    if (!requestContext)
      return jsonNoStore({ error: "Authentication required" }, 401);

    const loaded = await loadAccount(
      payoutAccountId,
      requestContext.user.id,
      requestContext.admin
    );
    if (loaded.error) {
      if (loaded.error.message.includes("admin_required")) {
        return jsonNoStore({ error: "Super Admin access required" }, 403);
      }
      return jsonNoStore({ error: "Unable to verify payout account" }, 500);
    }
    if (!loaded.account)
      return jsonNoStore({ error: "Payout account not found" }, 404);

    decryptPayoutDetails(
      String(loaded.account.details_ciphertext ?? ""),
      Number(loaded.account.encryption_key_version ?? 0)
    );

    const { data, error } = await requestContext.admin.rpc(
      "review_payout_account_request",
      {
        p_payout_account_id: payoutAccountId,
        p_decision: decision,
        p_admin_user_id: requestContext.user.id,
        p_review_note: reviewNote || null,
      }
    );

    if (error) {
      if (error.message.includes("admin_required")) {
        return jsonNoStore({ error: "Super Admin access required" }, 403);
      }
      if (error.message.includes("invalid_payout_account_review_state")) {
        return jsonNoStore(
          { error: "Payout account is no longer pending review" },
          409
        );
      }
      return jsonNoStore({ error: "Unable to review payout account" }, 500);
    }

    const result = Array.isArray(data) ? data[0] : null;
    return jsonNoStore({
      payoutAccount: {
        id: result?.payout_account_id ?? payoutAccountId,
        status:
          result?.status ??
          (decision === "approved" ? "active" : "rejected"),
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
            "Secure payout decryption is unavailable. The review was not recorded.",
          code: "payout_encryption_unavailable",
        },
        503
      );
    }
    console.error("Unable to review payout account");
    return jsonNoStore({ error: "Unable to review payout account" }, 500);
  }
}

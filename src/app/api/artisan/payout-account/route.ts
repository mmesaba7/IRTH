import { NextRequest, NextResponse } from "next/server";
import {
  encryptPayoutDetails,
  validateBankTransferDetails,
} from "@/lib/payouts/crypto";
import {
  getArtisanIdForUser,
  getPayoutServerContext,
  isSameOriginMutation,
  safeMessage,
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

async function getContext() {
  const context = await getPayoutServerContext();
  if (!context) return null;
  const artisanId = await getArtisanIdForUser(context.admin, context.user.id);
  if (!artisanId) return null;
  return { ...context, artisanId };
}

export async function GET() {
  try {
    const context = await getContext();
    if (!context) return jsonNoStore({ error: "Artisan authentication required" }, 401);

    const { data, error } = await context.admin.rpc(
      "get_artisan_payout_account_status",
      {
        p_artisan_id: context.artisanId,
        p_requester_user_id: context.user.id,
      }
    );

    if (error) {
      if (error.message.includes("access_denied") || error.message.includes("artisan_role_required")) {
        return jsonNoStore({ error: "Artisan access required" }, 403);
      }
      return jsonNoStore({ error: "Unable to load payout account status" }, 500);
    }

    return jsonNoStore({ payoutAccounts: data ?? [] });
  } catch {
    console.error("Unable to load artisan payout account status");
    return jsonNoStore({ error: "Unable to load payout account status" }, 500);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore({ error: "Cross-origin payout requests are not allowed" }, 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: "Invalid request body" }, 400);
  }

  const details = validateBankTransferDetails(body);
  if (!details) {
    return jsonNoStore(
      {
        error:
          "Enter valid bank name, account holder and account number. IBAN/SWIFT must be valid when provided.",
      },
      422
    );
  }

  try {
    const context = await getContext();
    if (!context) return jsonNoStore({ error: "Artisan authentication required" }, 401);

    const encrypted = encryptPayoutDetails(details);
    const { data, error } = await context.admin.rpc(
      "submit_bank_transfer_payout_account_request",
      {
        p_artisan_id: context.artisanId,
        p_requested_by_user_id: context.user.id,
        p_details_ciphertext: encrypted.detailsCiphertext,
        p_details_fingerprint: encrypted.detailsFingerprint,
        p_encryption_key_version: encrypted.encryptionKeyVersion,
      }
    );

    if (error) {
      if (error.message.includes("payout_account_verification_already_pending")) {
        return jsonNoStore(
          { error: "A payout detail change is already pending IRTH verification" },
          409
        );
      }
      if (error.message.includes("access_denied") || error.message.includes("artisan_role_required")) {
        return jsonNoStore({ error: "Artisan access required" }, 403);
      }
      return jsonNoStore({ error: "Unable to submit payout details" }, 500);
    }

    const result = Array.isArray(data) ? data[0] : null;
    if (!result?.payout_account_id || !result?.status) {
      return jsonNoStore({ error: "Unable to submit payout details" }, 500);
    }

    return jsonNoStore(
      {
        payoutAccount: {
          id: result.payout_account_id,
          status: result.status,
          changed: Boolean(result.changed),
        },
      },
      result.changed ? 201 : 200
    );
  } catch (error) {
    const message = safeMessage(error);
    if (
      message.includes("Missing payout encryption key configuration") ||
      message.includes("Invalid payout encryption key configuration")
    ) {
      return jsonNoStore(
        {
          error:
            "Secure payout encryption is not configured. Payout details were not stored.",
          code: "payout_encryption_not_configured",
        },
        503
      );
    }
    if (message.includes("Missing server-side Supabase secret configuration")) {
      return jsonNoStore({ error: "Payout service is not configured" }, 503);
    }

    console.error("Unable to submit artisan payout account");
    return jsonNoStore({ error: "Unable to submit payout details" }, 500);
  }
}

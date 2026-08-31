import { NextResponse } from "next/server";
import {
  getArtisanIdForUser,
  getPayoutServerContext,
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

export async function GET() {
  try {
    const context = await getPayoutServerContext();
    if (!context) return jsonNoStore({ error: "Authentication required" }, 401);

    const artisanId = await getArtisanIdForUser(context.admin, context.user.id);
    if (!artisanId) return jsonNoStore({ error: "Artisan access required" }, 403);

    const [dashboardResult, accountResult] = await Promise.all([
      context.admin.rpc("get_artisan_payout_dashboard", {
        p_artisan_id: artisanId,
        p_requester_user_id: context.user.id,
      }),
      context.admin.rpc("get_artisan_payout_account_status", {
        p_artisan_id: artisanId,
        p_requester_user_id: context.user.id,
      }),
    ]);

    if (dashboardResult.error || accountResult.error) {
      const message = dashboardResult.error?.message ?? accountResult.error?.message ?? "";
      if (message.includes("access_denied") || message.includes("artisan_role_required")) {
        return jsonNoStore({ error: "Artisan access required" }, 403);
      }
      return jsonNoStore({ error: "Unable to load payout information" }, 500);
    }

    return jsonNoStore({
      dashboard: dashboardResult.data ?? {
        summaryByCurrency: [],
        earnings: [],
        payouts: [],
      },
      payoutAccounts: accountResult.data ?? [],
    });
  } catch (error) {
    const message = safeMessage(error);
    if (message.includes("Missing server-side Supabase secret configuration")) {
      return jsonNoStore({ error: "Payout service is not configured" }, 503);
    }
    console.error("Unable to load artisan payout dashboard");
    return jsonNoStore({ error: "Unable to load payout information" }, 500);
  }
}

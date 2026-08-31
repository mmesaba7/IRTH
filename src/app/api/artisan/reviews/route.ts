import { NextRequest } from "next/server";
import { getArtisanIdForUser, getPayoutServerContext } from "@/lib/payouts/server";
import { cleanText, isSameOriginMutation, isUuid, jsonNoStore } from "@/lib/serverApi";

async function context() {
  const base = await getPayoutServerContext();
  if (!base) return null;
  const artisanId = await getArtisanIdForUser(base.admin, base.user.id);
  return artisanId ? { ...base, artisanId } : null;
}

export async function GET() {
  try {
    const ctx = await context();
    if (!ctx) return jsonNoStore({ error: "Artisan authentication required." }, 401);
    const { data, error } = await ctx.admin.rpc("get_artisan_reviews_dashboard", {
      p_artisan_id: ctx.artisanId,
      p_requester_user_id: ctx.user.id,
    });
    if (error) {
      if (error.message.includes("artisan_role_required") || error.message.includes("access_denied")) {
        return jsonNoStore({ error: "Artisan access required." }, 403);
      }
      return jsonNoStore({ error: "Unable to load artisan reviews." }, 500);
    }
    return jsonNoStore({ reviews: Array.isArray(data) ? data : [] });
  } catch {
    return jsonNoStore({ error: "Review service is unavailable." }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin review requests are not allowed." }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid reply request." }, 400);
  }

  if (!isUuid(body.reviewId)) return jsonNoStore({ error: "Invalid review." }, 400);
  const replyText = cleanText(body.replyText, 1, 3000);
  if (!replyText) return jsonNoStore({ error: "Enter a valid reply." }, 422);

  try {
    const ctx = await context();
    if (!ctx) return jsonNoStore({ error: "Artisan authentication required." }, 401);
    const { data, error } = await ctx.admin.rpc("submit_artisan_review_reply", {
      p_review_id: body.reviewId,
      p_artisan_id: ctx.artisanId,
      p_artisan_user_id: ctx.user.id,
      p_reply_text: replyText,
    });
    if (error) {
      if (error.message.includes("artisan_reply_already_exists")) return jsonNoStore({ error: "This review already has an Artisan reply." }, 409);
      if (error.message.includes("review_reply_not_allowed")) return jsonNoStore({ error: "This review is not available for reply." }, 409);
      if (error.message.includes("access_denied") || error.message.includes("artisan_role_required")) return jsonNoStore({ error: "Artisan access required." }, 403);
      return jsonNoStore({ error: "Unable to submit reply." }, 500);
    }
    return jsonNoStore({ replyId: data, status: "pending_review" }, 201);
  } catch {
    return jsonNoStore({ error: "Review service is unavailable." }, 503);
  }
}

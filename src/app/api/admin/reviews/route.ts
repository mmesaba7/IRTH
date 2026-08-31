import { NextRequest } from "next/server";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { cleanText, isSameOriginMutation, isUuid, jsonNoStore } from "@/lib/serverApi";

export async function GET() {
  try {
    const ctx = await getPayoutServerContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
    const [{ data, error }, { data: media, error: mediaError }] = await Promise.all([
      ctx.admin.rpc("get_review_moderation_queue", { p_admin_user_id: ctx.user.id }),
      ctx.admin.rpc("get_review_media_for_admin", { p_admin_user_id: ctx.user.id }),
    ]);
    if (error || mediaError) {
      const message = error?.message ?? mediaError?.message ?? "";
      if (message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      return jsonNoStore({ error: "Unable to load review moderation queue." }, 500);
    }

    const mediaItems = await Promise.all((Array.isArray(media) ? media : []).map(async (item) => {
      const { data: signed } = await ctx.admin.storage.from("review-media").createSignedUrl(item.storage_path, 900);
      return {
        id: item.media_id,
        reviewId: item.review_id,
        mimeType: item.mime_type,
        byteSize: item.byte_size,
        sortOrder: item.sort_order,
        signedUrl: signed?.signedUrl ?? null,
      };
    }));

    return jsonNoStore({
      reviews: Array.isArray(data?.reviews) ? data.reviews : [],
      replies: Array.isArray(data?.replies) ? data.replies : [],
      media: mediaItems,
    });
  } catch {
    return jsonNoStore({ error: "Review moderation service is unavailable." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin moderation requests are not allowed." }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid moderation request." }, 400);
  }

  const target = body.target;
  const id = body.id;
  const decision = body.decision;
  if ((target !== "review" && target !== "reply" && target !== "media") || !isUuid(id) || !["approved", "rejected", "hidden"].includes(String(decision))) {
    return jsonNoStore({ error: "Invalid moderation request." }, 422);
  }
  const note = body.note === undefined || body.note === null || body.note === "" ? null : cleanText(body.note, 1, 2000);
  if (body.note && !note) return jsonNoStore({ error: "Moderation note is too long or invalid." }, 422);

  try {
    const ctx = await getPayoutServerContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

    const rpc = target === "review" ? "review_customer_review" : target === "reply" ? "review_artisan_reply" : "review_review_media";
    const args = target === "review"
      ? { p_review_id: id, p_admin_user_id: ctx.user.id, p_decision: decision, p_note: note }
      : target === "reply"
        ? { p_reply_id: id, p_admin_user_id: ctx.user.id, p_decision: decision, p_note: note }
        : { p_media_id: id, p_admin_user_id: ctx.user.id, p_decision: decision, p_note: note };

    const { error } = await ctx.admin.rpc(rpc, args);
    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      if (error.message.includes("invalid_review_state") || error.message.includes("invalid_reply_state") || error.message.includes("invalid_review_media_state")) return jsonNoStore({ error: "This item is no longer in a reviewable state." }, 409);
      return jsonNoStore({ error: "Unable to save moderation decision." }, 500);
    }
    return jsonNoStore({ ok: true, target, id, decision });
  } catch {
    return jsonNoStore({ error: "Review moderation service is unavailable." }, 503);
  }
}

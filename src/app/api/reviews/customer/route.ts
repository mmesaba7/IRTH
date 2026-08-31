import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cleanText,
  hashOpaqueToken,
  isSameOriginMutation,
  isUuid,
  jsonNoStore,
  parseGuestToken,
} from "@/lib/serverApi";

async function identity(guestToken: unknown) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) return { userId: data.user.id, guestHash: null as string | null };
  const token = parseGuestToken(guestToken);
  return token
    ? { userId: null as string | null, guestHash: hashOpaqueToken(token) }
    : null;
}

function rating(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5
    ? Number(value)
    : null;
}

function mapReviewError(message: string) {
  if (message.includes("review_requires_delivery")) return [409, "This purchase has not been delivered yet."] as const;
  if (message.includes("review_already_exists_for_order_item")) return [409, "This purchased item already has a review."] as const;
  if (message.includes("review_edit_limit_reached")) return [409, "This review has already used its one allowed edit."] as const;
  if (message.includes("review_access_denied")) return [403, "Review access denied."] as const;
  if (message.includes("order_item_not_found") || message.includes("review_not_found")) return [404, "Review purchase not found."] as const;
  return [500, "Unable to save review right now."] as const;
}

export async function GET(request: NextRequest) {
  const orderItemId = request.nextUrl.searchParams.get("orderItemId");
  if (!isUuid(orderItemId)) return jsonNoStore({ error: "Invalid purchased item." }, 400);

  const auth = await identity(request.nextUrl.searchParams.get("guestToken"));
  if (!auth) return jsonNoStore({ error: "Review access requires the purchasing customer or guest order link." }, 401);

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_customer_review_context", {
      p_order_item_id: orderItemId,
      p_customer_user_id: auth.userId,
      p_guest_access_token_hash: auth.guestHash,
    });
    if (error) return jsonNoStore({ error: "Unable to load review eligibility." }, 500);
    if (!data) return jsonNoStore({ error: "Purchased item not found for this customer." }, 404);
    return jsonNoStore({ context: data });
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
    return jsonNoStore({ error: "Invalid review request." }, 400);
  }

  if (!isUuid(body.orderItemId)) return jsonNoStore({ error: "Invalid purchased item." }, 400);
  const productRating = rating(body.productRating);
  const artisanRating = rating(body.artisanRating);
  const reviewText = cleanText(body.reviewText, 1, 4000);
  if (!productRating || !artisanRating || !reviewText) return jsonNoStore({ error: "Enter valid ratings and review text." }, 422);

  const auth = await identity(body.guestToken);
  if (!auth) return jsonNoStore({ error: "Review access requires the purchasing customer or guest order link." }, 401);

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("create_verified_purchase_review", {
      p_order_item_id: body.orderItemId,
      p_customer_user_id: auth.userId,
      p_guest_access_token_hash: auth.guestHash,
      p_product_rating: productRating,
      p_artisan_rating: artisanRating,
      p_review_text: reviewText,
    });
    if (error) {
      const [status, message] = mapReviewError(error.message);
      return jsonNoStore({ error: message }, status);
    }
    return jsonNoStore({ reviewId: data, status: "pending_review" }, 201);
  } catch {
    return jsonNoStore({ error: "Review service is unavailable." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin review requests are not allowed." }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid review request." }, 400);
  }

  if (!isUuid(body.reviewId)) return jsonNoStore({ error: "Invalid review." }, 400);
  const productRating = rating(body.productRating);
  const artisanRating = rating(body.artisanRating);
  const reviewText = cleanText(body.reviewText, 1, 4000);
  if (!productRating || !artisanRating || !reviewText) return jsonNoStore({ error: "Enter valid ratings and review text." }, 422);

  const auth = await identity(body.guestToken);
  if (!auth) return jsonNoStore({ error: "Review access requires the purchasing customer or guest order link." }, 401);

  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("edit_verified_purchase_review", {
      p_review_id: body.reviewId,
      p_customer_user_id: auth.userId,
      p_guest_access_token_hash: auth.guestHash,
      p_product_rating: productRating,
      p_artisan_rating: artisanRating,
      p_review_text: reviewText,
    });
    if (error) {
      const [status, message] = mapReviewError(error.message);
      return jsonNoStore({ error: message }, status);
    }
    return jsonNoStore({ reviewId: body.reviewId, status: "pending_review", editCount: 1 });
  } catch {
    return jsonNoStore({ error: "Review service is unavailable." }, 503);
  }
}

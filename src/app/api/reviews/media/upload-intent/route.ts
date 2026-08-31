import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashOpaqueToken, isSameOriginMutation, isUuid, jsonNoStore, parseGuestToken } from "@/lib/serverApi";

const MAX_BYTES = 5 * 1024 * 1024;
const MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type AllowedMime = keyof typeof MIME;

async function identity(guestToken: unknown) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) return { userId: data.user.id, guestHash: null as string | null };
  const token = parseGuestToken(guestToken);
  return token ? { userId: null as string | null, guestHash: hashOpaqueToken(token) } : null;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin uploads are not allowed." }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid upload request." }, 400);
  }

  if (!isUuid(body.reviewId)) return jsonNoStore({ error: "Invalid review." }, 400);
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  const fileSize = Number(body.fileSize);
  if (!(mimeType in MIME)) return jsonNoStore({ error: "Only JPEG, PNG, and WebP images are allowed." }, 415);
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_BYTES) return jsonNoStore({ error: "Each image must be 5 MB or smaller." }, 413);

  const auth = await identity(body.guestToken);
  if (!auth) return jsonNoStore({ error: "Review access requires the purchasing customer or guest order link." }, 401);

  try {
    const admin = createAdminClient();
    const { data: context, error: contextError } = await admin.rpc("get_review_media_context", {
      p_review_id: body.reviewId,
      p_customer_user_id: auth.userId,
      p_guest_access_token_hash: auth.guestHash,
    });
    if (contextError) {
      if (contextError.message.includes("review_access_denied")) return jsonNoStore({ error: "Review access denied." }, 403);
      if (contextError.message.includes("review_not_found")) return jsonNoStore({ error: "Review not found." }, 404);
      return jsonNoStore({ error: "Unable to verify review media." }, 500);
    }

    const media = Array.isArray(context?.media) ? context.media : [];
    if (context?.reviewStatus !== "pending_review") return jsonNoStore({ error: "Images can only be changed while the review is pending IRTH review." }, 409);
    if (media.length >= 4) return jsonNoStore({ error: "This review already has the maximum 4 images." }, 409);

    const extension = MIME[mimeType as AllowedMime];
    const storagePath = `${body.reviewId}/${randomUUID()}.${extension}`;
    const { data: signedUpload, error: signedError } = await admin.storage.from("review-media").createSignedUploadUrl(storagePath);
    if (signedError || !signedUpload) return jsonNoStore({ error: "Unable to create image upload permission." }, 500);

    return jsonNoStore({ storagePath, token: signedUpload.token, mimeType });
  } catch {
    return jsonNoStore({ error: "Review image service is unavailable." }, 503);
  }
}

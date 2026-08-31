import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashOpaqueToken, isSameOriginMutation, isUuid, jsonNoStore, parseGuestToken } from "@/lib/serverApi";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

async function identity(guestToken: unknown) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) return { userId: data.user.id, guestHash: null as string | null };
  const token = parseGuestToken(guestToken);
  return token ? { userId: null as string | null, guestHash: hashOpaqueToken(token) } : null;
}

function hasExpectedSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= png.length && png.every((value, index) => bytes[index] === value);
  }
  if (mimeType === "image/webp") {
    return bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
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
  const storagePath = typeof body.storagePath === "string" ? body.storagePath.trim() : "";
  if (!storagePath.startsWith(`${body.reviewId}/`) || storagePath.length > 200) return jsonNoStore({ error: "Invalid review image path." }, 400);

  const auth = await identity(body.guestToken);
  if (!auth) return jsonNoStore({ error: "Review access requires the purchasing customer or guest order link." }, 401);

  const admin = createAdminClient();
  try {
    const { data: fileInfo, error: infoError } = await admin.storage.from("review-media").info(storagePath);
    if (infoError || !fileInfo) return jsonNoStore({ error: "Uploaded image was not found." }, 404);

    const byteSize = Number(fileInfo.size);
    const mimeType = fileInfo.contentType ?? "";
    if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > MAX_BYTES || !ALLOWED.has(mimeType)) {
      await admin.storage.from("review-media").remove([storagePath]);
      return jsonNoStore({ error: byteSize > MAX_BYTES ? "Each image must be 5 MB or smaller." : "Uploaded file is not an allowed image type." }, byteSize > MAX_BYTES ? 413 : 415);
    }

    const { data: blob, error: downloadError } = await admin.storage.from("review-media").download(storagePath);
    if (downloadError || !blob) {
      await admin.storage.from("review-media").remove([storagePath]);
      return jsonNoStore({ error: "Unable to inspect uploaded image." }, 500);
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (!hasExpectedSignature(bytes, mimeType)) {
      await admin.storage.from("review-media").remove([storagePath]);
      return jsonNoStore({ error: "Uploaded file content does not match its image type." }, 415);
    }

    const { data: mediaId, error } = await admin.rpc("finalize_review_media", {
      p_review_id: body.reviewId,
      p_customer_user_id: auth.userId,
      p_guest_access_token_hash: auth.guestHash,
      p_storage_path: storagePath,
      p_mime_type: mimeType,
      p_byte_size: byteSize,
    });

    if (error) {
      await admin.storage.from("review-media").remove([storagePath]);
      if (error.message.includes("review_access_denied")) return jsonNoStore({ error: "Review access denied." }, 403);
      if (error.message.includes("review_media_limit_reached")) return jsonNoStore({ error: "This review already has the maximum 4 images." }, 409);
      if (error.message.includes("review_media_requires_pending_review")) return jsonNoStore({ error: "Images can only be changed while the review is pending IRTH review." }, 409);
      return jsonNoStore({ error: "Unable to finalize review image." }, 500);
    }

    return jsonNoStore({ mediaId, status: "pending_review" }, 201);
  } catch {
    await admin.storage.from("review-media").remove([storagePath]);
    return jsonNoStore({ error: "Review image service is unavailable." }, 503);
  }
}

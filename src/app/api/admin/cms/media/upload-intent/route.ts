import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

import { getPayoutServerContext } from "@/lib/payouts/server";
import { isSameOriginMutation, jsonNoStore } from "@/lib/serverApi";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIME_CONFIG = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type AllowedMime = keyof typeof MIME_CONFIG;

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore({ error: "Cross-origin CMS media changes are not allowed." }, 403);
  }

  try {
    const ctx = await getPayoutServerContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      body = parsed as Record<string, unknown>;
    } catch {
      return jsonNoStore({ error: "Invalid media request." }, 400);
    }

    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
    const fileSize = Number(body.fileSize);

    if (!(mimeType in MIME_CONFIG)) {
      return jsonNoStore({ error: "Only JPEG, PNG, and WebP images are supported." }, 422);
    }
    if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return jsonNoStore({ error: "CMS images must be 5 MB or smaller." }, 422);
    }

    const extension = MIME_CONFIG[mimeType as AllowedMime];
    const storagePath = `cms/${ctx.user.id}/${randomUUID()}.${extension}`;

    const { data: signedUpload, error: signedUploadError } = await ctx.admin.storage
      .from("cms-media")
      .createSignedUploadUrl(storagePath);

    if (signedUploadError || !signedUpload) {
      return jsonNoStore({ error: "Unable to create CMS upload permission." }, 500);
    }

    const { data: assetId, error: assetError } = await ctx.admin.rpc(
      "create_admin_cms_media_asset",
      {
        p_storage_path: storagePath,
        p_mime_type: mimeType,
        p_file_size_bytes: fileSize,
        p_admin_user_id: ctx.user.id,
      }
    );

    if (assetError || typeof assetId !== "string") {
      if (assetError?.message.includes("admin_required")) {
        return jsonNoStore({ error: "Super Admin access required." }, 403);
      }
      return jsonNoStore({ error: "Unable to register CMS media." }, 500);
    }

    return jsonNoStore({
      assetId,
      storagePath,
      token: signedUpload.token,
      mimeType,
      maxFileSize: MAX_FILE_SIZE,
    });
  } catch {
    return jsonNoStore({ error: "CMS media service is unavailable." }, 503);
  }
}

import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

import { getPayoutServerContext } from "@/lib/payouts/server";
import { isSameOriginMutation, jsonNoStore } from "@/lib/serverApi";

const MAX_VIDEO_SIZE = 250 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore({ error: "Cross-origin CMS video changes are not allowed." }, 403);
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
      return jsonNoStore({ error: "Invalid video upload request." }, 400);
    }

    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
    const fileSize = Number(body.fileSize);

    if (mimeType !== "video/mp4") {
      return jsonNoStore({ error: "Country introduction video must be MP4." }, 422);
    }
    if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > MAX_VIDEO_SIZE) {
      return jsonNoStore({ error: "Country introduction video must be 250 MB or smaller." }, 422);
    }

    const storagePath = `${ctx.user.id}/${randomUUID()}.mp4`;
    const { data: asset, error } = await ctx.admin.rpc("create_admin_cms_video_asset", {
      p_storage_path: storagePath,
      p_mime_type: mimeType,
      p_file_size_bytes: fileSize,
      p_admin_user_id: ctx.user.id,
    });

    if (error || !asset || typeof asset !== "object") {
      if (error?.message.includes("admin_required")) {
        return jsonNoStore({ error: "Super Admin access required." }, 403);
      }
      return jsonNoStore({ error: "Unable to register Country video upload." }, 500);
    }

    const assetId = (asset as Record<string, unknown>).id;
    if (typeof assetId !== "string") {
      return jsonNoStore({ error: "Unable to register Country video upload." }, 500);
    }

    return jsonNoStore({
      assetId,
      storagePath,
      bucketName: "cms-videos",
      resumableEndpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
      maxFileSize: MAX_VIDEO_SIZE,
      maxDurationSeconds: 180,
    });
  } catch {
    return jsonNoStore({ error: "CMS video service is unavailable." }, 503);
  }
}

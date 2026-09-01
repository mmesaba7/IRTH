import { NextRequest } from "next/server";
import { createFile } from "mp4box";

import { getPayoutServerContext } from "@/lib/payouts/server";
import { isSameOriginMutation, jsonNoStore } from "@/lib/serverApi";

const MAX_VIDEO_SIZE = 250 * 1024 * 1024;
const MAX_DURATION_SECONDS = 180;

function getMp4DurationSeconds(buffer: ArrayBuffer): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const file = createFile();
      let resolved = false;

      file.onError = (message) => {
        if (!resolved) reject(new Error(String(message)));
      };
      file.onReady = (info) => {
        resolved = true;
        const duration = Number(info.duration) / Number(info.timescale);
        if (!Number.isFinite(duration) || duration <= 0) reject(new Error("invalid_duration"));
        else resolve(duration);
      };

      const mp4Buffer = buffer as ArrayBuffer & { fileStart: number };
      mp4Buffer.fileStart = 0;
      file.appendBuffer(mp4Buffer);
      file.flush();
    } catch (error) {
      reject(error);
    }
  });
}

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
      return jsonNoStore({ error: "Invalid video finalize request." }, 400);
    }

    const assetId = typeof body.assetId === "string" ? body.assetId : "";
    if (!/^[0-9a-f-]{36}$/i.test(assetId)) {
      return jsonNoStore({ error: "Invalid Country video asset." }, 422);
    }

    const { data: list, error: listError } = await ctx.admin.rpc("get_admin_cms_video_assets", {
      p_admin_user_id: ctx.user.id,
    });
    if (listError) {
      if (listError.message.includes("admin_required")) {
        return jsonNoStore({ error: "Super Admin access required." }, 403);
      }
      return jsonNoStore({ error: "Unable to verify Country video." }, 500);
    }

    const videos = Array.isArray(list) ? list as Array<Record<string, unknown>> : [];
    const asset = videos.find((item) => item.id === assetId);
    if (!asset) return jsonNoStore({ error: "Country video asset not found." }, 404);
    if (asset.status === "ready") {
      return jsonNoStore({ ok: true, asset });
    }

    const storagePath = typeof asset.storagePath === "string" ? asset.storagePath : "";
    const expectedSize = Number(asset.fileSizeBytes);
    if (!storagePath || !Number.isFinite(expectedSize) || expectedSize <= 0 || expectedSize > MAX_VIDEO_SIZE) {
      return jsonNoStore({ error: "Country video metadata is invalid." }, 422);
    }

    const { data: blob, error: downloadError } = await ctx.admin.storage
      .from("cms-videos")
      .download(storagePath);
    if (downloadError || !blob) {
      return jsonNoStore({ error: "Uploaded Country video could not be read." }, 422);
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const isMp4 = bytes.length >= 12 &&
      bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;

    if (!isMp4 || bytes.byteLength !== expectedSize) {
      await ctx.admin.storage.from("cms-videos").remove([storagePath]);
      return jsonNoStore({ error: "Country video file does not match the expected MP4 type or size." }, 422);
    }

    let durationSeconds: number;
    try {
      durationSeconds = await getMp4DurationSeconds(bytes.buffer);
    } catch {
      await ctx.admin.storage.from("cms-videos").remove([storagePath]);
      return jsonNoStore({ error: "Country video duration could not be verified." }, 422);
    }

    if (durationSeconds > MAX_DURATION_SECONDS) {
      await ctx.admin.storage.from("cms-videos").remove([storagePath]);
      return jsonNoStore({ error: "Country introduction video must be 3 minutes or shorter." }, 422);
    }

    const { data: finalized, error: finalizeError } = await ctx.admin.rpc("finalize_admin_cms_video_asset", {
      p_asset_id: assetId,
      p_actual_mime_type: "video/mp4",
      p_actual_file_size_bytes: bytes.byteLength,
      p_duration_seconds: durationSeconds,
      p_admin_user_id: ctx.user.id,
    });

    if (finalizeError || !finalized) {
      return jsonNoStore({ error: "Unable to finalize Country video." }, 500);
    }

    const { data: signed } = await ctx.admin.storage
      .from("cms-videos")
      .createSignedUrl(storagePath, 60 * 60);

    return jsonNoStore({ ok: true, asset: finalized, previewUrl: signed?.signedUrl ?? null });
  } catch {
    return jsonNoStore({ error: "CMS video service is unavailable." }, 503);
  }
}

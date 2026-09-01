import { NextRequest } from "next/server";

import { getPayoutServerContext } from "@/lib/payouts/server";
import { isSameOriginMutation, jsonNoStore } from "@/lib/serverApi";

function detectMime(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

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
      return jsonNoStore({ error: "Invalid media finalize request." }, 400);
    }

    const assetId = typeof body.assetId === "string" ? body.assetId : "";
    if (!/^[0-9a-f-]{36}$/i.test(assetId)) {
      return jsonNoStore({ error: "Invalid CMS media asset." }, 422);
    }

    const { data: assetList, error: listError } = await ctx.admin.rpc(
      "get_admin_cms_media_assets",
      { p_admin_user_id: ctx.user.id }
    );

    if (listError) {
      if (listError.message.includes("admin_required")) {
        return jsonNoStore({ error: "Super Admin access required." }, 403);
      }
      return jsonNoStore({ error: "Unable to verify CMS media." }, 500);
    }

    const assets = Array.isArray(assetList) ? assetList : [];
    const asset = assets.find(
      (item) => item && typeof item === "object" && (item as Record<string, unknown>).id === assetId
    ) as Record<string, unknown> | undefined;

    if (!asset) return jsonNoStore({ error: "CMS media asset not found." }, 404);

    const storagePath = typeof asset.storagePath === "string" ? asset.storagePath : "";
    const expectedMime = typeof asset.mimeType === "string" ? asset.mimeType : "";
    const expectedSize = Number(asset.fileSizeBytes);

    const { data: fileBlob, error: downloadError } = await ctx.admin.storage
      .from("cms-media")
      .download(storagePath);

    if (downloadError || !fileBlob) {
      return jsonNoStore({ error: "Uploaded CMS media could not be read." }, 422);
    }

    const bytes = new Uint8Array(await fileBlob.arrayBuffer());
    const actualMime = detectMime(bytes);

    if (!actualMime || actualMime !== expectedMime || bytes.byteLength !== expectedSize) {
      await ctx.admin.storage.from("cms-media").remove([storagePath]);
      return jsonNoStore({ error: "CMS media content does not match its declared type or size." }, 422);
    }

    const { data: finalized, error: finalizeError } = await ctx.admin.rpc(
      "finalize_admin_cms_media_asset",
      {
        p_asset_id: assetId,
        p_actual_mime_type: actualMime,
        p_actual_file_size_bytes: bytes.byteLength,
        p_admin_user_id: ctx.user.id,
      }
    );

    if (finalizeError) {
      if (finalizeError.message.includes("admin_required")) {
        return jsonNoStore({ error: "Super Admin access required." }, 403);
      }
      return jsonNoStore({ error: "Unable to finalize CMS media." }, 500);
    }

    const { data: signed, error: signedError } = await ctx.admin.storage
      .from("cms-media")
      .createSignedUrl(storagePath, 60 * 60);

    return jsonNoStore({
      ok: true,
      asset: finalized,
      previewUrl: signedError ? null : signed?.signedUrl ?? null,
    });
  } catch {
    return jsonNoStore({ error: "CMS media service is unavailable." }, 503);
  }
}

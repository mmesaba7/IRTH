import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/serverApi";

const ASSET_KEYS = [
  "mainLogoAssetId",
  "alternateLogoAssetId",
  "faviconAssetId",
  "defaultSocialImageAssetId",
  "defaultPlaceholderAssetId",
] as const;

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: document, error } = await admin.rpc("get_published_cms_document", {
      p_document_key: "brand",
    });

    if (error) return jsonNoStore({ error: "Unable to load Brand assets." }, 500);
    if (!document || typeof document !== "object") return jsonNoStore({ document: null, assets: {} });

    const record = document as Record<string, unknown>;
    const payload = record.payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return jsonNoStore({ document: null, assets: {} });
    }

    const payloadRecord = payload as Record<string, unknown>;
    const assets: Record<string, string | null> = {};

    for (const key of ASSET_KEYS) {
      const assetId = typeof payloadRecord[key] === "string" ? payloadRecord[key] as string : null;
      if (!assetId) {
        assets[key] = null;
        continue;
      }

      const { data: asset, error: assetError } = await admin.rpc("get_cms_media_asset_server", {
        p_asset_id: assetId,
      });
      if (assetError || !asset || typeof asset !== "object") {
        assets[key] = null;
        continue;
      }

      const storagePath = (asset as Record<string, unknown>).storagePath;
      if (typeof storagePath !== "string") {
        assets[key] = null;
        continue;
      }

      const { data: signed, error: signedError } = await admin.storage
        .from("cms-media")
        .createSignedUrl(storagePath, 60 * 60);

      assets[key] = signedError ? null : signed?.signedUrl ?? null;
    }

    return jsonNoStore({ document, assets });
  } catch {
    return jsonNoStore({ error: "Brand assets service is unavailable." }, 503);
  }
}

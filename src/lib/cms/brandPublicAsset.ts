import { createAdminClient } from "@/lib/supabase/admin";

type BrandAssetKey = "faviconAssetId" | "defaultSocialImageAssetId";

export async function resolvePublishedBrandAsset(key: BrandAssetKey) {
  const admin = createAdminClient();
  const { data: document, error } = await admin.rpc("get_published_cms_document", {
    p_document_key: "brand",
  });
  if (error || !document || typeof document !== "object" || Array.isArray(document)) return null;

  const payload = (document as Record<string, unknown>).payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const assetId = (payload as Record<string, unknown>)[key];
  if (typeof assetId !== "string") return null;

  const { data: asset, error: assetError } = await admin.rpc("get_cms_media_asset_server", {
    p_asset_id: assetId,
  });
  if (assetError || !asset || typeof asset !== "object" || Array.isArray(asset)) return null;
  const storagePath = (asset as Record<string, unknown>).storagePath;
  if (typeof storagePath !== "string" || !storagePath) return null;

  const { data: signed, error: signedError } = await admin.storage
    .from("cms-media")
    .createSignedUrl(storagePath, 60 * 15);
  return signedError ? null : signed?.signedUrl ?? null;
}

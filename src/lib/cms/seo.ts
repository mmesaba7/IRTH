import { createAdminClient } from "@/lib/supabase/admin";

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function absoluteSiteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalized}`;
}

export async function getPublishedCmsPayload(documentKey: string, contentType: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_published_cms_document", {
    p_document_key: documentKey,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  if (record.contentType !== contentType) return null;
  return record.payload ?? null;
}

export async function resolveCmsMediaSignedUrl(assetId: string | null | undefined) {
  if (!assetId) return null;
  const admin = createAdminClient();
  const { data: asset, error } = await admin.rpc("get_cms_media_asset_server", {
    p_asset_id: assetId,
  });
  if (error || !asset || typeof asset !== "object" || Array.isArray(asset)) return null;
  const storagePath = (asset as Record<string, unknown>).storagePath;
  if (typeof storagePath !== "string" || !storagePath) return null;
  const { data: signed, error: signedError } = await admin.storage
    .from("cms-media")
    .createSignedUrl(storagePath, 60 * 15);
  return signedError ? null : signed?.signedUrl ?? null;
}

export function defaultSocialImageUrl() {
  return absoluteSiteUrl("/api/cms/brand/social-image");
}

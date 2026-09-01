import { NextRequest } from "next/server";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { jsonNoStore } from "@/lib/serverApi";

const KEY_RE = /^(homepage|brand|footer:main|help:main|contact:main|campaign:main|blog:[a-z0-9]+(?:-[a-z0-9]+)*|page:[a-z0-9]+(?:-[a-z0-9]+)*|country:[a-z0-9]+(?:-[a-z0-9]+)*)$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function collectMediaIds(value: unknown, output: Map<string, "image" | "video">, keyName = "") {
  if (Array.isArray(value)) {
    for (const item of value) collectMediaIds(item, output, keyName);
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === "string" && UUID_RE.test(item) && /AssetId$/.test(key)) {
      output.set(item, /VideoAssetId$/.test(key) ? "video" : "image");
      continue;
    }
    if (Array.isArray(item) && /AssetIds$/.test(key)) {
      for (const id of item) if (typeof id === "string" && UUID_RE.test(id)) output.set(id, "image");
      continue;
    }
    collectMediaIds(item, output, key);
  }
}

export async function GET(request: NextRequest) {
  const ctx = await getPayoutServerContext();
  if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

  const key = request.nextUrl.searchParams.get("key")?.trim() ?? "";
  if (!KEY_RE.test(key) || key.length > 120) return jsonNoStore({ error: "Invalid preview document key." }, 422);

  const { data: document, error } = await ctx.admin.rpc("get_admin_cms_document", {
    p_document_key: key,
    p_admin_user_id: ctx.user.id,
  });
  if (error) {
    if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
    return jsonNoStore({ error: "Unable to load preview." }, 500);
  }
  if (!document || typeof document !== "object" || Array.isArray(document)) return jsonNoStore({ error: "CMS document not found." }, 404);

  const record = document as Record<string, unknown>;
  const payload = record.draftPayload ?? record.publishedPayload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return jsonNoStore({ error: "No previewable payload exists." }, 404);

  const ids = new Map<string, "image" | "video">();
  collectMediaIds(payload, ids);
  const media: Record<string, string | null> = {};

  for (const [assetId, type] of ids) {
    const rpcName = type === "video" ? "get_cms_video_asset_server" : "get_cms_media_asset_server";
    const bucket = type === "video" ? "cms-videos" : "cms-media";
    const { data: asset, error: assetError } = await ctx.admin.rpc(rpcName, { p_asset_id: assetId });
    if (assetError || !asset || typeof asset !== "object" || Array.isArray(asset)) {
      media[assetId] = null;
      continue;
    }
    const storagePath = (asset as Record<string, unknown>).storagePath;
    if (typeof storagePath !== "string" || !storagePath) {
      media[assetId] = null;
      continue;
    }
    const { data: signed, error: signedError } = await ctx.admin.storage.from(bucket).createSignedUrl(storagePath, 60 * 15);
    media[assetId] = signedError ? null : signed?.signedUrl ?? null;
  }

  return jsonNoStore({
    document: {
      key: record.key,
      contentType: record.contentType,
      draftRevision: record.draftRevision,
      publishedRevision: record.publishedRevision,
      updatedAt: record.updatedAt,
      publishedAt: record.publishedAt,
      payload,
      previewSource: record.draftPayload ? "draft" : "published",
    },
    media,
  });
}

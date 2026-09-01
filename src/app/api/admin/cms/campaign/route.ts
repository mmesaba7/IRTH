import { NextRequest } from "next/server";

import { CAMPAIGN_DOCUMENT_KEY, parseCampaignPayload } from "@/lib/cms/campaign";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { isSameOriginMutation, jsonNoStore } from "@/lib/serverApi";

async function getContext() {
  return getPayoutServerContext();
}

async function validateBackgroundAsset(
  ctx: NonNullable<Awaited<ReturnType<typeof getPayoutServerContext>>>,
  assetId: string | null
) {
  if (!assetId) return true;
  const { data, error } = await ctx.admin.rpc("get_cms_media_asset_server", { p_asset_id: assetId });
  return !error && Boolean(data);
}

export async function GET() {
  const ctx = await getContext();
  if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

  const [{ data: document, error: documentError }, { data: assets, error: assetsError }] = await Promise.all([
    ctx.admin.rpc("get_admin_cms_document", {
      p_document_key: CAMPAIGN_DOCUMENT_KEY,
      p_admin_user_id: ctx.user.id,
    }),
    ctx.admin.rpc("get_admin_cms_media_assets", {
      p_admin_user_id: ctx.user.id,
    }),
  ]);

  const error = documentError ?? assetsError;
  if (error) {
    if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
    return jsonNoStore({ error: "Unable to load Campaign content." }, 500);
  }

  const readyAssets = Array.isArray(assets)
    ? (assets as Array<Record<string, unknown>>).filter((asset) => asset.status === "ready")
    : [];

  const resolvedAssets = await Promise.all(readyAssets.map(async (asset) => {
    const storagePath = typeof asset.storagePath === "string" ? asset.storagePath : "";
    const { data: signed } = await ctx.admin.storage.from("cms-media").createSignedUrl(storagePath, 60 * 60);
    return { ...asset, previewUrl: signed?.signedUrl ?? null };
  }));

  return jsonNoStore({ document: document ?? null, assets: resolvedAssets });
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);
  const ctx = await getContext();
  if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

  let raw: unknown;
  try { raw = await request.json(); } catch { return jsonNoStore({ error: "Invalid Campaign request." }, 400); }
  const payload = parseCampaignPayload(raw);
  if (!payload) return jsonNoStore({ error: "Campaign content is invalid or incomplete." }, 422);
  if (!(await validateBackgroundAsset(ctx, payload.backgroundImageAssetId))) {
    return jsonNoStore({ error: "Campaign background image is invalid or not finalized." }, 422);
  }

  const { data, error } = await ctx.admin.rpc("save_admin_cms_draft", {
    p_document_key: CAMPAIGN_DOCUMENT_KEY,
    p_content_type: "campaign",
    p_payload: payload,
    p_admin_user_id: ctx.user.id,
  });
  if (error) {
    if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
    return jsonNoStore({ error: "Unable to save Campaign draft." }, 500);
  }
  return jsonNoStore({ ok: true, result: data });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);
  const ctx = await getContext();
  if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

  let body: Record<string, unknown>;
  try {
    const raw = await request.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error();
    body = raw as Record<string, unknown>;
  } catch { return jsonNoStore({ error: "Invalid Campaign publish request." }, 400); }
  if (body.action !== "publish") return jsonNoStore({ error: "Invalid publish action." }, 422);

  const { data: document, error: documentError } = await ctx.admin.rpc("get_admin_cms_document", {
    p_document_key: CAMPAIGN_DOCUMENT_KEY,
    p_admin_user_id: ctx.user.id,
  });
  if (documentError || !document || typeof document !== "object" || Array.isArray(document)) {
    return jsonNoStore({ error: "Save a Campaign draft before publishing." }, 422);
  }
  const payload = parseCampaignPayload((document as Record<string, unknown>).draftPayload);
  if (!payload) return jsonNoStore({ error: "Campaign draft is invalid." }, 422);
  if (!(await validateBackgroundAsset(ctx, payload.backgroundImageAssetId))) {
    return jsonNoStore({ error: "Campaign background image is invalid or not finalized." }, 422);
  }

  const { data, error } = await ctx.admin.rpc("publish_admin_cms_document", {
    p_document_key: CAMPAIGN_DOCUMENT_KEY,
    p_admin_user_id: ctx.user.id,
  });
  if (error) {
    if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
    return jsonNoStore({ error: "Unable to publish Campaign." }, 500);
  }
  return jsonNoStore({ ok: true, result: data });
}

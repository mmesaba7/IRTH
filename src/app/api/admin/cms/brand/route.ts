import { NextRequest } from "next/server";

import { getPayoutServerContext } from "@/lib/payouts/server";
import { isSameOriginMutation, jsonNoStore } from "@/lib/serverApi";

const ASSET_KEYS = [
  "mainLogoAssetId",
  "alternateLogoAssetId",
  "faviconAssetId",
  "defaultSocialImageAssetId",
  "defaultPlaceholderAssetId",
] as const;

type AssetKey = (typeof ASSET_KEYS)[number];
type BrandPayload = { schemaVersion: 1 } & Record<AssetKey, string | null>;

async function requireContext() {
  const ctx = await getPayoutServerContext();
  if (!ctx) return { response: jsonNoStore({ error: "Authentication required." }, 401) } as const;
  return { ctx } as const;
}

async function validateAssetIds(
  ctx: NonNullable<Awaited<ReturnType<typeof getPayoutServerContext>>>,
  payload: BrandPayload
) {
  for (const key of ASSET_KEYS) {
    const assetId = payload[key];
    if (!assetId) continue;
    const { data, error } = await ctx.admin.rpc("get_cms_media_asset_server", {
      p_asset_id: assetId,
    });
    if (error || !data) return false;
  }
  return true;
}

function parsePayload(value: unknown): BrandPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const payload = { schemaVersion: 1 } as BrandPayload;

  for (const key of ASSET_KEYS) {
    const raw = record[key];
    if (raw === null || raw === undefined || raw === "") {
      payload[key] = null;
      continue;
    }
    if (typeof raw !== "string" || !/^[0-9a-f-]{36}$/i.test(raw)) return null;
    payload[key] = raw;
  }

  return payload;
}

export async function GET() {
  try {
    const result = await requireContext();
    if ("response" in result) return result.response;

    const [{ data: document, error: documentError }, { data: assets, error: assetsError }] =
      await Promise.all([
        result.ctx.admin.rpc("get_admin_cms_document", {
          p_document_key: "brand",
          p_admin_user_id: result.ctx.user.id,
        }),
        result.ctx.admin.rpc("get_admin_cms_media_assets", {
          p_admin_user_id: result.ctx.user.id,
        }),
      ]);

    const error = documentError ?? assetsError;
    if (error) {
      if (error.message.includes("admin_required")) {
        return jsonNoStore({ error: "Super Admin access required." }, 403);
      }
      return jsonNoStore({ error: "Unable to load Brand & Site Assets." }, 500);
    }

    const readyAssets = Array.isArray(assets)
      ? (assets as Array<Record<string, unknown>>).filter((asset) => asset.status === "ready")
      : [];

    const assetsWithPreview = await Promise.all(
      readyAssets.map(async (asset) => {
        const storagePath = typeof asset.storagePath === "string" ? asset.storagePath : "";
        const { data: signed } = await result.ctx.admin.storage
          .from("cms-media")
          .createSignedUrl(storagePath, 60 * 60);
        return { ...asset, previewUrl: signed?.signedUrl ?? null };
      })
    );

    return jsonNoStore({ document, assets: assetsWithPreview });
  } catch {
    return jsonNoStore({ error: "Brand CMS service is unavailable." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);
  }

  try {
    const result = await requireContext();
    if ("response" in result) return result.response;

    let body: unknown;
    try { body = await request.json(); } catch { return jsonNoStore({ error: "Invalid Brand request." }, 400); }
    const payload = parsePayload(body);
    if (!payload) return jsonNoStore({ error: "Brand asset configuration is invalid." }, 422);

    if (!(await validateAssetIds(result.ctx, payload))) {
      return jsonNoStore({ error: "One or more Brand assets are invalid or not finalized." }, 422);
    }

    const { data, error } = await result.ctx.admin.rpc("save_admin_cms_draft", {
      p_document_key: "brand",
      p_content_type: "brand",
      p_payload: payload,
      p_admin_user_id: result.ctx.user.id,
    });

    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      return jsonNoStore({ error: "Unable to save Brand draft." }, 500);
    }

    return jsonNoStore({ ok: true, result: data });
  } catch {
    return jsonNoStore({ error: "Brand CMS service is unavailable." }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);
  }

  try {
    const result = await requireContext();
    if ("response" in result) return result.response;

    let body: Record<string, unknown> = {};
    try {
      const parsed = await request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
    } catch {
      return jsonNoStore({ error: "Invalid Brand publish request." }, 400);
    }

    if (body.action !== "publish") return jsonNoStore({ error: "Invalid Brand publish action." }, 422);

    const { data: document, error: documentError } = await result.ctx.admin.rpc(
      "get_admin_cms_document",
      { p_document_key: "brand", p_admin_user_id: result.ctx.user.id }
    );
    if (documentError || !document || typeof document !== "object") {
      return jsonNoStore({ error: "Save a Brand draft before publishing." }, 422);
    }

    const draftPayload = parsePayload((document as Record<string, unknown>).draftPayload);
    if (!draftPayload || !(await validateAssetIds(result.ctx, draftPayload))) {
      return jsonNoStore({ error: "Brand draft contains invalid media assets." }, 422);
    }

    const { data, error } = await result.ctx.admin.rpc("publish_admin_cms_document", {
      p_document_key: "brand",
      p_admin_user_id: result.ctx.user.id,
    });

    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      return jsonNoStore({ error: "Unable to publish Brand assets." }, 500);
    }

    return jsonNoStore({ ok: true, result: data });
  } catch {
    return jsonNoStore({ error: "Brand CMS service is unavailable." }, 503);
  }
}

import { NextRequest } from "next/server";

import { countryContentDocumentKey, parseCountryContentPayload } from "@/lib/cms/country";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { isSameOriginMutation, jsonNoStore } from "@/lib/serverApi";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Ctx = NonNullable<Awaited<ReturnType<typeof getPayoutServerContext>>>;

async function loadContext(slug: string) {
  const ctx = await getPayoutServerContext();
  if (!ctx) return { response: jsonNoStore({ error: "Authentication required." }, 401) } as const;
  if (!SLUG_RE.test(slug) || slug.length > 80) return { response: jsonNoStore({ error: "Invalid country slug." }, 422) } as const;

  const { data: country, error: countryError } = await ctx.admin
    .from("countries")
    .select("id, slug, name_ar, name_en, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (countryError) return { response: jsonNoStore({ error: "Unable to load country." }, 500) } as const;
  if (!country) return { response: jsonNoStore({ error: "Country not found." }, 404) } as const;

  const { data: gate, error: gateError } = await ctx.admin.rpc("get_admin_cms_section_registry", {
    p_admin_user_id: ctx.user.id,
  });
  if (gateError) {
    if (gateError.message.includes("admin_required")) return { response: jsonNoStore({ error: "Super Admin access required." }, 403) } as const;
    return { response: jsonNoStore({ error: "Unable to verify CMS access." }, 500) } as const;
  }
  void gate;

  return { ctx, country } as const;
}

async function validateAssets(ctx: Ctx, ids: Array<string | null>) {
  for (const id of ids) {
    if (!id) continue;
    const { data, error } = await ctx.admin.rpc("get_cms_media_asset_server", { p_asset_id: id });
    if (error || !data || typeof data !== "object" || (data as Record<string, unknown>).status !== "ready") return false;
  }
  return true;
}

async function assetsWithPreview(ctx: Ctx) {
  const { data, error } = await ctx.admin.rpc("get_admin_cms_media_assets", {
    p_admin_user_id: ctx.user.id,
  });
  if (error) throw error;
  const ready = Array.isArray(data)
    ? (data as Array<Record<string, unknown>>).filter((asset) => asset.status === "ready")
    : [];

  return Promise.all(ready.map(async (asset) => {
    const storagePath = typeof asset.storagePath === "string" ? asset.storagePath : "";
    const { data: signed } = await ctx.admin.storage.from("cms-media").createSignedUrl(storagePath, 60 * 60);
    return { ...asset, previewUrl: signed?.signedUrl ?? null };
  }));
}

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const result = await loadContext(slug);
    if ("response" in result) return result.response;

    const [{ data: document, error: documentError }, assets] = await Promise.all([
      result.ctx.admin.rpc("get_admin_cms_document", {
        p_document_key: countryContentDocumentKey(slug),
        p_admin_user_id: result.ctx.user.id,
      }),
      assetsWithPreview(result.ctx),
    ]);

    if (documentError) return jsonNoStore({ error: "Unable to load Country CMS." }, 500);
    return jsonNoStore({ country: result.country, document, assets });
  } catch {
    return jsonNoStore({ error: "Country CMS service is unavailable." }, 503);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);

  try {
    const { slug } = await context.params;
    const result = await loadContext(slug);
    if ("response" in result) return result.response;

    let raw: unknown;
    try { raw = await request.json(); } catch { return jsonNoStore({ error: "Invalid Country CMS request." }, 400); }
    const payload = parseCountryContentPayload(raw);
    if (!payload || payload.slug !== slug || payload.countryId !== result.country.id) {
      return jsonNoStore({ error: "Country content is invalid or does not match this country." }, 422);
    }

    const mediaIds = [payload.coverImageAssetId, payload.seo.ogImageAssetId, ...payload.culturalImageAssetIds];
    if (!(await validateAssets(result.ctx, mediaIds))) {
      return jsonNoStore({ error: "One or more Country media assets are invalid or not finalized." }, 422);
    }

    const { data, error } = await result.ctx.admin.rpc("save_admin_cms_draft", {
      p_document_key: countryContentDocumentKey(slug),
      p_content_type: "country_content",
      p_payload: payload,
      p_admin_user_id: result.ctx.user.id,
    });

    if (error) return jsonNoStore({ error: "Unable to save Country draft." }, 500);
    return jsonNoStore({ ok: true, result: data });
  } catch {
    return jsonNoStore({ error: "Country CMS service is unavailable." }, 503);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);

  try {
    const { slug } = await context.params;
    const result = await loadContext(slug);
    if ("response" in result) return result.response;

    let body: Record<string, unknown> = {};
    try {
      const parsed = await request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
    } catch { return jsonNoStore({ error: "Invalid Country publish request." }, 400); }
    if (body.action !== "publish") return jsonNoStore({ error: "Invalid Country publish action." }, 422);

    const { data: document, error: documentError } = await result.ctx.admin.rpc("get_admin_cms_document", {
      p_document_key: countryContentDocumentKey(slug),
      p_admin_user_id: result.ctx.user.id,
    });
    if (documentError || !document || typeof document !== "object") {
      return jsonNoStore({ error: "Save a Country draft before publishing." }, 422);
    }

    const payload = parseCountryContentPayload((document as Record<string, unknown>).draftPayload);
    if (!payload || payload.slug !== slug || payload.countryId !== result.country.id) {
      return jsonNoStore({ error: "Country draft is invalid." }, 422);
    }

    const mediaIds = [payload.coverImageAssetId, payload.seo.ogImageAssetId, ...payload.culturalImageAssetIds];
    if (!(await validateAssets(result.ctx, mediaIds))) {
      return jsonNoStore({ error: "Country draft contains invalid media assets." }, 422);
    }

    const { data, error } = await result.ctx.admin.rpc("publish_admin_cms_document", {
      p_document_key: countryContentDocumentKey(slug),
      p_admin_user_id: result.ctx.user.id,
    });
    if (error) return jsonNoStore({ error: "Unable to publish Country content." }, 500);
    return jsonNoStore({ ok: true, result: data });
  } catch {
    return jsonNoStore({ error: "Country CMS service is unavailable." }, 503);
  }
}

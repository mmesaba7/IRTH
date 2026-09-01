import { NextRequest } from "next/server";

import { countryContentDocumentKey, parseCountryContentPayload } from "@/lib/cms/country";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/serverApi";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    if (!SLUG_RE.test(slug) || slug.length > 80) return jsonNoStore({ error: "Invalid country slug." }, 400);

    const admin = createAdminClient();
    const { data: country, error: countryError } = await admin
      .from("countries")
      .select("id, slug, is_active")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (countryError) return jsonNoStore({ error: "Unable to load country." }, 500);
    if (!country) return jsonNoStore({ document: null, media: {} });

    const { data: document, error } = await admin.rpc("get_published_cms_document", {
      p_document_key: countryContentDocumentKey(slug),
    });
    if (error) return jsonNoStore({ error: "Unable to load Country content." }, 500);
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return jsonNoStore({ document: null, media: {} });
    }

    const record = document as Record<string, unknown>;
    const payload = parseCountryContentPayload(record.payload);
    if (!payload || payload.countryId !== country.id || payload.slug !== slug) {
      return jsonNoStore({ document: null, media: {} });
    }

    const ids = Array.from(new Set([
      payload.coverImageAssetId,
      payload.seo.ogImageAssetId,
      ...payload.culturalImageAssetIds,
    ].filter((value): value is string => Boolean(value))));

    const media: Record<string, string | null> = {};
    for (const assetId of ids) {
      const { data: asset, error: assetError } = await admin.rpc("get_cms_media_asset_server", {
        p_asset_id: assetId,
      });
      if (assetError || !asset || typeof asset !== "object") {
        media[assetId] = null;
        continue;
      }

      const storagePath = (asset as Record<string, unknown>).storagePath;
      if (typeof storagePath !== "string" || !storagePath) {
        media[assetId] = null;
        continue;
      }

      const { data: signed, error: signedError } = await admin.storage
        .from("cms-media")
        .createSignedUrl(storagePath, 60 * 60);
      media[assetId] = signedError ? null : signed?.signedUrl ?? null;
    }

    return jsonNoStore({ document: { ...record, payload }, media });
  } catch {
    return jsonNoStore({ error: "Country content service is unavailable." }, 503);
  }
}

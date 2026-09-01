import { NextRequest } from "next/server";

import { countryContentDocumentKey, parseCountryContentPayload } from "@/lib/cms/country";
import { createAdminClient } from "@/lib/supabase/admin";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    if (!SLUG_RE.test(slug) || slug.length > 80) return new Response(null, { status: 404 });

    const admin = createAdminClient();
    const { data: country, error: countryError } = await admin
      .from("countries")
      .select("id, slug")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (countryError || !country) return new Response(null, { status: 404 });

    const { data: document, error: documentError } = await admin.rpc(
      "get_published_cms_document",
      { p_document_key: countryContentDocumentKey(slug) }
    );

    if (documentError || !document || typeof document !== "object" || Array.isArray(document)) {
      return new Response(null, { status: 404 });
    }

    const payload = parseCountryContentPayload((document as Record<string, unknown>).payload);
    if (
      !payload ||
      payload.countryId !== country.id ||
      payload.slug !== slug ||
      !payload.coverImageAssetId
    ) {
      return new Response(null, { status: 404 });
    }

    const { data: asset, error: assetError } = await admin.rpc("get_cms_media_asset_server", {
      p_asset_id: payload.coverImageAssetId,
    });

    if (assetError || !asset || typeof asset !== "object" || Array.isArray(asset)) {
      return new Response(null, { status: 404 });
    }

    const storagePath = (asset as Record<string, unknown>).storagePath;
    if (typeof storagePath !== "string" || !storagePath) return new Response(null, { status: 404 });

    const { data: signed, error: signedError } = await admin.storage
      .from("cms-media")
      .createSignedUrl(storagePath, 60 * 60);

    if (signedError || !signed?.signedUrl) return new Response(null, { status: 404 });

    return Response.redirect(signed.signedUrl, 307);
  } catch {
    return new Response(null, { status: 404 });
  }
}

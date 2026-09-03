import { NextRequest } from "next/server";

import { countryContentDocumentKey, parseCountryContentPayload } from "@/lib/cms/country";
import { createAdminClient } from "@/lib/supabase/admin";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function countryFallbackCover() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="IRTH country cover fallback">
      <rect width="1200" height="800" fill="#062c38"/>
      <g fill="none" stroke="#d4a017" stroke-opacity="0.22" stroke-width="3">
        <path d="M0 140 140 0l140 140L420 0l140 140L700 0l140 140L980 0l220 220"/>
        <path d="M0 420 140 280l140 140 140-140 140 140 140-140 140 140 140-140 260 260"/>
        <path d="M0 700 140 560l140 140 140-140 140 140 140-140 140 140 140-140 260 240"/>
      </g>
      <circle cx="945" cy="175" r="170" fill="#c4673a" fill-opacity="0.16"/>
      <circle cx="210" cy="650" r="210" fill="#6c7f68" fill-opacity="0.18"/>
    </svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}

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
      return countryFallbackCover();
    }

    const payload = parseCountryContentPayload((document as Record<string, unknown>).payload);
    if (
      !payload ||
      payload.countryId !== country.id ||
      payload.slug !== slug ||
      !payload.coverImageAssetId
    ) {
      return countryFallbackCover();
    }

    const { data: asset, error: assetError } = await admin.rpc("get_cms_media_asset_server", {
      p_asset_id: payload.coverImageAssetId,
    });

    if (assetError || !asset || typeof asset !== "object" || Array.isArray(asset)) {
      return countryFallbackCover();
    }

    const storagePath = (asset as Record<string, unknown>).storagePath;
    if (typeof storagePath !== "string" || !storagePath) return countryFallbackCover();

    const { data: signed, error: signedError } = await admin.storage
      .from("cms-media")
      .createSignedUrl(storagePath, 60 * 60);

    if (signedError || !signed?.signedUrl) return countryFallbackCover();

    return Response.redirect(signed.signedUrl, 307);
  } catch {
    return new Response(null, { status: 404 });
  }
}

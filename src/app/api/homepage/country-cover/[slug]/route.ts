import { NextRequest } from "next/server";

import { countryContentDocumentKey, parseCountryContentPayload } from "@/lib/cms/country";
import { createAdminClient } from "@/lib/supabase/admin";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function countryFallbackCover(slug: string) {
  const scenes: Record<string, string> = {
    jordan: `<path d="M0 610 170 430l105 80 150-215 160 205 125-120 160 230Z" fill="#8f5a3c"/><path d="M0 650 210 500l110 65 150-190 175 190 135-90 220 175Z" fill="#c48a5a" opacity=".82"/><circle cx="880" cy="150" r="82" fill="#d9a13b" opacity=".9"/>`,
    morocco: `<path d="M0 610V370l110-70 105 70 110-70 110 70 110-70 110 70 110-70 110 70 125-75v315Z" fill="#b85d3d"/><path d="M0 650h1200v150H0z" fill="#d7b47a"/><path d="M115 520h150v130H115zm330 0h150v130H445zm330 0h150v130H775z" fill="#073b3c" opacity=".86"/>`,
    "saudi-arabia": `<path d="M0 650 210 525l145 55 190-190 170 170 145-95 340 185v150H0Z" fill="#a96d3d"/><path d="M0 690c180-70 340-45 520 5s350 55 680-25v130H0Z" fill="#d6ad70"/><circle cx="920" cy="160" r="90" fill="#d9a13b" opacity=".92"/>`,
    uae: `<path d="M0 665h1200v135H0z" fill="#d7b47a"/><path d="M720 665V245h55v420zm90 0V175h42v490zm78 0V310h64v355zm108 0V225h50v440z" fill="#d9a13b" opacity=".76"/><path d="M0 610c190-90 330-60 485 20s280 65 420 10 210-55 295-15v175H0Z" fill="#c88a55" opacity=".82"/>`,
  };

  const scene = scenes[slug] ?? `<path d="M0 650 180 500l150 90 180-210 180 210 150-100 360 160v150H0Z" fill="#8b6747"/><circle cx="920" cy="160" r="90" fill="#d9a13b" opacity=".85"/>`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="IRTH demo country cover">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#0b5360"/><stop offset="1" stop-color="#073b3c"/></linearGradient>
        <pattern id="p" width="72" height="72" patternUnits="userSpaceOnUse"><path d="M0 36 36 0l36 36-36 36Z" fill="none" stroke="#f6f0e4" stroke-opacity=".08" stroke-width="2"/></pattern>
      </defs>
      <rect width="1200" height="800" fill="url(#sky)"/>
      <rect width="1200" height="800" fill="url(#p)"/>
      ${scene}
      <rect y="590" width="1200" height="210" fill="#062c38" opacity=".24"/>
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
      return countryFallbackCover(slug);
    }

    const payload = parseCountryContentPayload((document as Record<string, unknown>).payload);
    if (
      !payload ||
      payload.countryId !== country.id ||
      payload.slug !== slug ||
      !payload.coverImageAssetId
    ) {
      return countryFallbackCover(slug);
    }

    const { data: asset, error: assetError } = await admin.rpc("get_cms_media_asset_server", {
      p_asset_id: payload.coverImageAssetId,
    });

    if (assetError || !asset || typeof asset !== "object" || Array.isArray(asset)) {
      return countryFallbackCover(slug);
    }

    const storagePath = (asset as Record<string, unknown>).storagePath;
    if (typeof storagePath !== "string" || !storagePath) return countryFallbackCover(slug);

    const { data: signed, error: signedError } = await admin.storage
      .from("cms-media")
      .createSignedUrl(storagePath, 60 * 60);

    if (signedError || !signed?.signedUrl) return countryFallbackCover(slug);

    return Response.redirect(signed.signedUrl, 307);
  } catch {
    return new Response(null, { status: 404 });
  }
}

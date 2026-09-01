import { NextResponse } from "next/server";
import { resolvePublishedBrandAsset } from "@/lib/cms/brandPublicAsset";

export async function GET() {
  const url = await resolvePublishedBrandAsset("defaultSocialImageAssetId");
  if (!url) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(url, { status: 307, headers: { "Cache-Control": "public, max-age=300" } });
}

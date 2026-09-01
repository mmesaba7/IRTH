import { NextRequest } from "next/server";

import { blogDocumentKey } from "@/lib/cms/blog";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/serverApi";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
      return jsonNoStore({ error: "Invalid blog slug." }, 400);
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_published_cms_document", {
      p_document_key: blogDocumentKey(slug),
    });

    if (error) {
      return jsonNoStore({ error: "Unable to load blog post." }, 500);
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return jsonNoStore({ error: "Blog post not found." }, 404);
    }

    const record = data as Record<string, unknown>;
    if (record.contentType !== "blog_post") {
      return jsonNoStore({ error: "Blog post not found." }, 404);
    }

    let coverImageUrl: string | null = null;
    const payload = record.payload;
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const assetId = (payload as Record<string, unknown>).coverImageAssetId;
      if (typeof assetId === "string") {
        const { data: asset } = await admin.rpc("get_cms_media_asset_server", {
          p_asset_id: assetId,
        });
        if (asset && typeof asset === "object") {
          const storagePath = (asset as Record<string, unknown>).storagePath;
          if (typeof storagePath === "string") {
            const { data: signed, error: signedError } = await admin.storage
              .from("cms-media")
              .createSignedUrl(storagePath, 60 * 60);
            if (!signedError) coverImageUrl = signed?.signedUrl ?? null;
          }
        }
      }
    }

    return jsonNoStore({ post: data, coverImageUrl });
  } catch {
    return jsonNoStore({ error: "Blog service is unavailable." }, 503);
  }
}

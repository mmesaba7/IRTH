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

    return jsonNoStore({ post: data });
  } catch {
    return jsonNoStore({ error: "Blog service is unavailable." }, 503);
  }
}

import { NextRequest } from "next/server";

import { staticPageDocumentKey } from "@/lib/cms/staticPage";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/serverApi";

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
      return jsonNoStore({ error: "Invalid page slug." }, 400);
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_published_cms_document", {
      p_document_key: staticPageDocumentKey(slug),
    });

    if (error) return jsonNoStore({ error: "Unable to load page." }, 500);
    if (!data || typeof data !== "object" || Array.isArray(data)) return jsonNoStore({ error: "Page not found." }, 404);

    const record = data as Record<string, unknown>;
    if (record.contentType !== "static_page") return jsonNoStore({ error: "Page not found." }, 404);

    return jsonNoStore({ page: data });
  } catch {
    return jsonNoStore({ error: "Page service is unavailable." }, 503);
  }
}

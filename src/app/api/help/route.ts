import { HELP_DOCUMENT_KEY, parseHelpPayload } from "@/lib/cms/help";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/serverApi";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_published_cms_document", {
      p_document_key: HELP_DOCUMENT_KEY,
    });
    if (error) return jsonNoStore({ error: "Unable to load Help content." }, 500);
    if (!data || typeof data !== "object" || Array.isArray(data)) return jsonNoStore({ error: "Help content not found." }, 404);

    const record = data as Record<string, unknown>;
    if (record.contentType !== "help") return jsonNoStore({ error: "Help content not found." }, 404);
    const payload = parseHelpPayload(record.payload);
    if (!payload) return jsonNoStore({ error: "Help content is unavailable." }, 503);

    return jsonNoStore({ help: payload });
  } catch {
    return jsonNoStore({ error: "Help service is unavailable." }, 503);
  }
}
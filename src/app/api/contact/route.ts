import { CONTACT_DOCUMENT_KEY, parseContactPayload } from "@/lib/cms/contact";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/serverApi";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_published_cms_document", { p_document_key: CONTACT_DOCUMENT_KEY });
    if (error) return jsonNoStore({ error: "Unable to load Contact content." }, 500);
    if (!data || typeof data !== "object" || Array.isArray(data)) return jsonNoStore({ error: "Contact content not found." }, 404);
    const record = data as Record<string, unknown>;
    if (record.contentType !== "contact") return jsonNoStore({ error: "Contact content not found." }, 404);
    const payload = parseContactPayload(record.payload);
    if (!payload) return jsonNoStore({ error: "Contact content is unavailable." }, 503);
    return jsonNoStore({ contact: payload });
  } catch { return jsonNoStore({ error: "Contact service is unavailable." }, 503); }
}
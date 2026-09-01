import { FOOTER_DOCUMENT_KEY, parseFooterPayload } from "@/lib/cms/footer";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/serverApi";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_published_cms_document", { p_document_key: FOOTER_DOCUMENT_KEY });
    if (error) return jsonNoStore({ error: "Unable to load Footer content." }, 500);
    if (!data || typeof data !== "object" || Array.isArray(data)) return jsonNoStore({ error: "Footer content not found." }, 404);
    const record = data as Record<string, unknown>;
    if (record.contentType !== "footer") return jsonNoStore({ error: "Footer content not found." }, 404);
    const payload = parseFooterPayload(record.payload);
    if (!payload) return jsonNoStore({ error: "Footer content is unavailable." }, 503);
    return jsonNoStore({ footer: payload });
  } catch { return jsonNoStore({ error: "Footer service is unavailable." }, 503); }
}
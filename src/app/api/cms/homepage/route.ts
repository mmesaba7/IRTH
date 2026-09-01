import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/serverApi";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_published_cms_document", {
      p_document_key: "homepage",
    });

    if (error) {
      console.error("Unable to load published homepage CMS:", error);
      return jsonNoStore({ error: "Unable to load homepage configuration." }, 500);
    }

    if (!data) {
      return jsonNoStore({ error: "Published homepage configuration not found." }, 404);
    }

    return jsonNoStore({ document: data });
  } catch (error) {
    console.error("Homepage CMS public API unavailable:", error);
    return jsonNoStore({ error: "Homepage configuration service is unavailable." }, 503);
  }
}

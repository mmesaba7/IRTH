import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/serverApi";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_public_artisan_rating_summary");
    if (error) return jsonNoStore({ error: "Unable to load artisan ratings." }, 500);
    return jsonNoStore({ ratings: Array.isArray(data) ? data : [] });
  } catch {
    return jsonNoStore({ error: "Artisan rating service is unavailable." }, 503);
  }
}

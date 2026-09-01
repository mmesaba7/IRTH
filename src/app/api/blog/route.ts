import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/serverApi";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_published_blog_posts", {
      p_limit: 24,
    });

    if (error) {
      return jsonNoStore({ error: "Unable to load blog posts." }, 500);
    }

    return jsonNoStore({ posts: Array.isArray(data) ? data : [] });
  } catch {
    return jsonNoStore({ error: "Blog service is unavailable." }, 503);
  }
}

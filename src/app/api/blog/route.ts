import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/serverApi";

async function resolveCoverUrl(admin: ReturnType<typeof createAdminClient>, assetId: unknown) {
  if (typeof assetId !== "string") return null;
  const { data: asset, error } = await admin.rpc("get_cms_media_asset_server", {
    p_asset_id: assetId,
  });
  if (error || !asset || typeof asset !== "object") return null;
  const storagePath = (asset as Record<string, unknown>).storagePath;
  if (typeof storagePath !== "string") return null;
  const { data: signed, error: signedError } = await admin.storage
    .from("cms-media")
    .createSignedUrl(storagePath, 60 * 60);
  return signedError ? null : signed?.signedUrl ?? null;
}

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_published_blog_posts", {
      p_limit: 24,
    });

    if (error) {
      return jsonNoStore({ error: "Unable to load blog posts." }, 500);
    }

    const posts = Array.isArray(data) ? data : [];
    const resolved = await Promise.all(
      posts.map(async (post) => {
        if (!post || typeof post !== "object" || Array.isArray(post)) return post;
        const record = post as Record<string, unknown>;
        const payload = record.payload;
        const payloadRecord = payload && typeof payload === "object" && !Array.isArray(payload)
          ? payload as Record<string, unknown>
          : null;
        const coverImageUrl = await resolveCoverUrl(admin, payloadRecord?.coverImageAssetId);
        return { ...record, coverImageUrl };
      })
    );

    return jsonNoStore({ posts: resolved });
  } catch {
    return jsonNoStore({ error: "Blog service is unavailable." }, 503);
  }
}

import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/serverApi";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const normalized = slug.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(normalized)) {
    return jsonNoStore({ error: "Invalid product." }, 400);
  }

  try {
    const admin = createAdminClient();
    const [{ data: reviews, error: reviewsError }, { data: media, error: mediaError }] = await Promise.all([
      admin.rpc("get_published_product_reviews", { p_product_slug: normalized }),
      admin.rpc("get_published_review_media_paths", { p_product_slug: normalized }),
    ]);
    if (reviewsError || mediaError) return jsonNoStore({ error: "Unable to load reviews." }, 500);

    const mediaByReview = new Map<string, Array<{ id: string; url: string }>>();
    for (const item of Array.isArray(media) ? media : []) {
      const { data: signed } = await admin.storage.from("review-media").createSignedUrl(item.storage_path, 900);
      if (!signed?.signedUrl) continue;
      const current = mediaByReview.get(item.review_id) ?? [];
      current.push({ id: item.media_id, url: signed.signedUrl });
      mediaByReview.set(item.review_id, current);
    }

    return jsonNoStore({
      reviews: (Array.isArray(reviews) ? reviews : []).map((review) => ({
        ...review,
        images: mediaByReview.get(review.review_id) ?? [],
      })),
    });
  } catch {
    return jsonNoStore({ error: "Review service is unavailable." }, 503);
  }
}

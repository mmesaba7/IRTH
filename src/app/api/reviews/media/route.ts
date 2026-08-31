import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashOpaqueToken, isUuid, jsonNoStore, parseGuestToken } from "@/lib/serverApi";

async function identity(guestToken: unknown) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) return { userId: data.user.id, guestHash: null as string | null };
  const token = parseGuestToken(guestToken);
  return token ? { userId: null as string | null, guestHash: hashOpaqueToken(token) } : null;
}

export async function GET(request: NextRequest) {
  const reviewId = request.nextUrl.searchParams.get("reviewId");
  if (!isUuid(reviewId)) return jsonNoStore({ error: "Invalid review." }, 400);
  const auth = await identity(request.nextUrl.searchParams.get("guestToken"));
  if (!auth) return jsonNoStore({ error: "Review access requires the purchasing customer or guest order link." }, 401);

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_review_media_context", {
      p_review_id: reviewId,
      p_customer_user_id: auth.userId,
      p_guest_access_token_hash: auth.guestHash,
    });
    if (error) {
      if (error.message.includes("review_access_denied")) return jsonNoStore({ error: "Review access denied." }, 403);
      if (error.message.includes("review_not_found")) return jsonNoStore({ error: "Review not found." }, 404);
      return jsonNoStore({ error: "Unable to load review images." }, 500);
    }

    const media = Array.isArray(data?.media) ? data.media : [];
    const items = await Promise.all(media.map(async (item: Record<string, unknown>) => {
      const storagePath = typeof item.storagePath === "string" ? item.storagePath : "";
      const { data: signed } = await admin.storage.from("review-media").createSignedUrl(storagePath, 900);
      return {
        id: item.id,
        status: item.status,
        mimeType: item.mimeType,
        byteSize: item.byteSize,
        sortOrder: item.sortOrder,
        signedUrl: signed?.signedUrl ?? null,
      };
    }));

    return jsonNoStore({ reviewStatus: data?.reviewStatus ?? null, media: items });
  } catch {
    return jsonNoStore({ error: "Review image service is unavailable." }, 503);
  }
}

import { CAMPAIGN_DOCUMENT_KEY, isCampaignLive, parseCampaignPayload } from "@/lib/cms/campaign";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/serverApi";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: document, error } = await admin.rpc("get_published_cms_document", {
      p_document_key: CAMPAIGN_DOCUMENT_KEY,
    });
    if (error) return jsonNoStore({ error: "Unable to load Campaign." }, 500);
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return jsonNoStore({ campaign: null, backgroundImageUrl: null });
    }

    const record = document as Record<string, unknown>;
    if (record.contentType !== "campaign") return jsonNoStore({ campaign: null, backgroundImageUrl: null });
    const payload = parseCampaignPayload(record.payload);
    if (!payload || !isCampaignLive(payload)) return jsonNoStore({ campaign: null, backgroundImageUrl: null });

    let backgroundImageUrl: string | null = null;
    if (payload.backgroundImageAssetId) {
      const { data: asset, error: assetError } = await admin.rpc("get_cms_media_asset_server", {
        p_asset_id: payload.backgroundImageAssetId,
      });
      if (!assetError && asset && typeof asset === "object" && !Array.isArray(asset)) {
        const storagePath = (asset as Record<string, unknown>).storagePath;
        if (typeof storagePath === "string" && storagePath) {
          const { data: signed, error: signedError } = await admin.storage
            .from("cms-media")
            .createSignedUrl(storagePath, 60 * 60);
          if (!signedError) backgroundImageUrl = signed?.signedUrl ?? null;
        }
      }
    }

    return jsonNoStore({ campaign: payload, backgroundImageUrl });
  } catch {
    return jsonNoStore({ error: "Campaign service is unavailable." }, 503);
  }
}

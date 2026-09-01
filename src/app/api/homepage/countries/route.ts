import { countryContentDocumentKey, parseCountryContentPayload } from "@/lib/cms/country";
import { jsonNoStore } from "@/lib/serverApi";
import { createAdminClient } from "@/lib/supabase/admin";

type CountryRow = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
};

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("countries")
      .select("id, slug, name_ar, name_en")
      .eq("is_active", true)
      .order("name_en", { ascending: true });

    if (error) return jsonNoStore({ error: "Unable to load homepage countries." }, 500);

    const rows = (data ?? []) as CountryRow[];
    const countries = await Promise.all(
      rows.map(async (country) => {
        let coverImageUrl: string | null = null;

        const { data: document, error: documentError } = await admin.rpc(
          "get_published_cms_document",
          { p_document_key: countryContentDocumentKey(country.slug) }
        );

        if (!documentError && document && typeof document === "object" && !Array.isArray(document)) {
          const record = document as Record<string, unknown>;
          const payload = parseCountryContentPayload(record.payload);

          if (
            payload &&
            payload.countryId === country.id &&
            payload.slug === country.slug &&
            payload.coverImageAssetId
          ) {
            const { data: asset, error: assetError } = await admin.rpc(
              "get_cms_media_asset_server",
              { p_asset_id: payload.coverImageAssetId }
            );

            if (!assetError && asset && typeof asset === "object" && !Array.isArray(asset)) {
              const storagePath = (asset as Record<string, unknown>).storagePath;
              if (typeof storagePath === "string" && storagePath) {
                const { data: signed, error: signedError } = await admin.storage
                  .from("cms-media")
                  .createSignedUrl(storagePath, 60 * 60);
                if (!signedError) coverImageUrl = signed?.signedUrl ?? null;
              }
            }
          }
        }

        return {
          id: country.id,
          slug: country.slug,
          nameAr: country.name_ar,
          nameEn: country.name_en,
          coverImageUrl,
        };
      })
    );

    return jsonNoStore({ countries });
  } catch {
    return jsonNoStore({ error: "Homepage country service is unavailable." }, 503);
  }
}

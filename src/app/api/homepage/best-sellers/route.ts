import { createAdminClient } from "@/lib/supabase/admin";
import { jsonNoStore } from "@/lib/serverApi";
import type { Product } from "@/app/data/products";

type BestSellerRow = {
  product_id: string;
  sold_quantity: number | string;
  latest_paid_at: string;
};

type ProductRow = {
  id: string;
  slug: string;
  artisan_id: string;
  primary_craft_id: string;
  name_ar: string | null;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  story_ar: string | null;
  story_en: string | null;
  material_ar: string | null;
  material_en: string | null;
  dimensions: string | null;
  weight: string | null;
  made_to_order: boolean;
  preparation_time: string | null;
  one_of_a_kind: boolean;
  customization: boolean;
};

type ArtisanRow = {
  id: string;
  slug: string;
  name_ar: string | null;
  name_en: string;
  country_id: string;
  region_ar: string | null;
  region_en: string | null;
};

type CraftRow = {
  id: string;
  name_ar: string | null;
  name_en: string;
};

type CountryRow = {
  id: string;
  name_ar: string | null;
  name_en: string;
};

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: rankingData, error: rankingError } = await admin.rpc(
      "get_homepage_best_sellers",
      { p_limit: 12 }
    );

    if (rankingError) {
      console.error("Unable to load homepage best sellers ranking:", rankingError);
      return jsonNoStore({ error: "Unable to load best sellers." }, 500);
    }

    const rankingRows = (rankingData ?? []) as BestSellerRow[];
    if (rankingRows.length === 0) {
      return jsonNoStore({ products: [] });
    }

    const productIds = rankingRows.map((row) => row.product_id);
    const { data: productData, error: productError } = await admin
      .from("products")
      .select(
        "id, slug, artisan_id, primary_craft_id, name_ar, name_en, description_ar, description_en, story_ar, story_en, material_ar, material_en, dimensions, weight, made_to_order, preparation_time, one_of_a_kind, customization"
      )
      .in("id", productIds)
      .eq("lifecycle_status", "published");

    if (productError) {
      console.error("Unable to load homepage best sellers products:", productError);
      return jsonNoStore({ error: "Unable to load best sellers." }, 500);
    }

    const productRows = (productData ?? []) as ProductRow[];
    const artisanIds = [...new Set(productRows.map((product) => product.artisan_id))];
    const craftIds = [...new Set(productRows.map((product) => product.primary_craft_id))];

    const [{ data: artisanData, error: artisanError }, { data: craftData, error: craftError }] =
      await Promise.all([
        admin
          .from("artisan_profiles")
          .select("id, slug, name_ar, name_en, country_id, region_ar, region_en")
          .in("id", artisanIds)
          .eq("status", "active"),
        admin
          .from("crafts")
          .select("id, name_ar, name_en")
          .in("id", craftIds)
          .eq("is_active", true),
      ]);

    if (artisanError || craftError) {
      console.error("Unable to load homepage best sellers relations:", {
        artisans: artisanError,
        crafts: craftError,
      });
      return jsonNoStore({ error: "Unable to load best sellers." }, 500);
    }

    const artisanRows = (artisanData ?? []) as ArtisanRow[];
    const craftRows = (craftData ?? []) as CraftRow[];
    const countryIds = [...new Set(artisanRows.map((artisan) => artisan.country_id))];

    const { data: countryData, error: countryError } = countryIds.length
      ? await admin
          .from("countries")
          .select("id, name_ar, name_en")
          .in("id", countryIds)
          .eq("is_active", true)
      : { data: [], error: null };

    if (countryError) {
      console.error("Unable to load homepage best sellers countries:", countryError);
      return jsonNoStore({ error: "Unable to load best sellers." }, 500);
    }

    const productMap = new Map(productRows.map((product) => [product.id, product]));
    const artisanMap = new Map(((artisanData ?? []) as ArtisanRow[]).map((artisan) => [artisan.id, artisan]));
    const craftMap = new Map(((craftData ?? []) as CraftRow[]).map((craft) => [craft.id, craft]));
    const countryMap = new Map(((countryData ?? []) as CountryRow[]).map((country) => [country.id, country]));
    const accents: Product["accent"][] = ["terracotta", "olive", "copper"];

    const products = rankingRows.flatMap((ranking, index): Product[] => {
      const product = productMap.get(ranking.product_id);
      if (!product) return [];

      const artisan = artisanMap.get(product.artisan_id);
      const craft = craftMap.get(product.primary_craft_id);
      const country = artisan ? countryMap.get(artisan.country_id) : undefined;
      if (!artisan || !craft || !country) return [];

      const craftName = craft.name_en || craft.name_ar || "Craft";
      return [
        {
          id: product.id,
          slug: product.slug,
          artisanSlug: artisan.slug,
          name: product.name_ar || product.name_en,
          artisan: artisan.name_ar || artisan.name_en,
          country: country.name_ar || country.name_en,
          price: 0,
          category: craftName,
          accent: accents[index % accents.length],
          origin:
            artisan.region_ar ||
            artisan.region_en ||
            country.name_ar ||
            country.name_en,
          artisanRole: `${craftName} artisan`,
          objectLabel: craftName,
          description: product.description_ar || product.description_en || "",
          material: product.material_ar || product.material_en || "",
          story: product.story_ar || product.story_en || "",
          status: "approved",
          dimensions: product.dimensions || undefined,
          weight: product.weight || undefined,
          madeToOrder: product.made_to_order,
          preparationTime: product.preparation_time || undefined,
          oneOfAKind: product.one_of_a_kind,
          customization: product.customization,
        },
      ];
    });

    return jsonNoStore({ products: products.slice(0, 6) });
  } catch (error) {
    console.error("Homepage best sellers API unavailable:", error);
    return jsonNoStore({ error: "Best sellers service is unavailable." }, 503);
  }
}

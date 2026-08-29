import type { Product } from "@/app/data/products";
import { publicCountries } from "@/app/data/countries";
import { createClient } from "@/lib/supabase/client";

type DbCountry = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
};

type DbCraft = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
};

type DbArtisan = {
  id: string;
  slug: string;
  name_ar: string | null;
  name_en: string;
  country_id: string;
  region_ar: string | null;
  region_en: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  story_ar: string | null;
  story_en: string | null;
  primary_craft_id: string;
  profile_image_url: string | null;
  video_url: string | null;
};

type DbArtisanCraft = {
  artisan_id: string;
  craft_id: string;
};

type DbProduct = {
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
  price: number | string;
  dimensions: string | null;
  weight: string | null;
  made_to_order: boolean;
  preparation_time: string | null;
  one_of_a_kind: boolean;
  customization: boolean;
  quantity: number | null;
};

export type PublicCatalogCraft = {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  searchTerms: string[];
};

export type PublicCatalogCountry = {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  heroImage?: string;
  culturalDescription?: string;
  culturalVideo?: string;
  crafts: string[];
  craftOptions: Array<{ label: string; value: string }>;
  searchTerms: string[];
};

export type PublicCatalogArtisan = {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  country: string;
  countryEn: string;
  region: string;
  regionEn: string;
  mainCraft: string;
  mainCraftEn: string;
  additionalCrafts: string[];
  bio: string;
  story: string;
  profileImage: string | null;
  video: string | null;
  searchTerms: string[];
};

export type PublicCatalogProduct = Product & {
  id: string;
  quantity: number | null;
  searchTerms: string[];
};

export type PublicMarketplaceCatalog = {
  countries: PublicCatalogCountry[];
  crafts: PublicCatalogCraft[];
  artisans: PublicCatalogArtisan[];
  products: PublicCatalogProduct[];
};

export async function loadPublicMarketplaceCatalog(): Promise<PublicMarketplaceCatalog> {
  const supabase = createClient();

  const [
    countriesResult,
    craftsResult,
    artisansResult,
    artisanCraftsResult,
    productsResult,
  ] = await Promise.all([
    supabase
      .from("countries")
      .select("id, slug, name_ar, name_en")
      .eq("is_active", true)
      .order("name_en", { ascending: true }),
    supabase
      .from("crafts")
      .select("id, slug, name_ar, name_en")
      .eq("is_active", true)
      .order("name_en", { ascending: true }),
    supabase
      .from("artisan_profiles")
      .select(
        "id, slug, name_ar, name_en, country_id, region_ar, region_en, bio_ar, bio_en, story_ar, story_en, primary_craft_id, profile_image_url, video_url"
      )
      .eq("status", "active")
      .order("slug", { ascending: true }),
    supabase.from("artisan_crafts").select("artisan_id, craft_id"),
    supabase
      .from("products")
      .select(
        "id, slug, artisan_id, primary_craft_id, name_ar, name_en, description_ar, description_en, story_ar, story_en, material_ar, material_en, price, dimensions, weight, made_to_order, preparation_time, one_of_a_kind, customization, quantity"
      )
      .eq("lifecycle_status", "published")
      .order("created_at", { ascending: false }),
  ]);

  const firstError =
    countriesResult.error ??
    craftsResult.error ??
    artisansResult.error ??
    artisanCraftsResult.error ??
    productsResult.error;

  if (firstError) throw firstError;

  const countryRows = (countriesResult.data ?? []) as DbCountry[];
  const craftRows = (craftsResult.data ?? []) as DbCraft[];
  const artisanRows = (artisansResult.data ?? []) as DbArtisan[];
  const artisanCraftRows = (artisanCraftsResult.data ?? []) as DbArtisanCraft[];
  const productRows = (productsResult.data ?? []) as DbProduct[];

  const countryMap = new Map(countryRows.map((country) => [country.id, country]));
  const craftMap = new Map(craftRows.map((craft) => [craft.id, craft]));

  const visibleArtisanRows = artisanRows.filter(
    (artisan) =>
      countryMap.has(artisan.country_id) && craftMap.has(artisan.primary_craft_id)
  );
  const artisanRowMap = new Map(
    visibleArtisanRows.map((artisan) => [artisan.id, artisan])
  );

  const craftIdsByArtisan = new Map<string, Set<string>>();
  for (const relation of artisanCraftRows) {
    if (!artisanRowMap.has(relation.artisan_id) || !craftMap.has(relation.craft_id)) {
      continue;
    }
    const craftIds = craftIdsByArtisan.get(relation.artisan_id) ?? new Set<string>();
    craftIds.add(relation.craft_id);
    craftIdsByArtisan.set(relation.artisan_id, craftIds);
  }

  const artisans: PublicCatalogArtisan[] = visibleArtisanRows.map((artisan) => {
    const country = countryMap.get(artisan.country_id)!;
    const mainCraft = craftMap.get(artisan.primary_craft_id)!;
    const additionalCrafts = [...(craftIdsByArtisan.get(artisan.id) ?? [])]
      .filter((craftId) => craftId !== artisan.primary_craft_id)
      .map((craftId) => craftMap.get(craftId))
      .filter((craft): craft is DbCraft => Boolean(craft));

    const name = artisan.name_ar || artisan.name_en;
    const countryName = country.name_ar || country.name_en;
    const region = artisan.region_ar || artisan.region_en || countryName;
    const mainCraftName = mainCraft.name_ar || mainCraft.name_en;
    const bio = artisan.bio_ar || artisan.bio_en || "";
    const story = artisan.story_ar || artisan.story_en || "";

    return {
      id: artisan.id,
      slug: artisan.slug,
      name,
      nameEn: artisan.name_en,
      country: countryName,
      countryEn: country.name_en,
      region,
      regionEn: artisan.region_en || country.name_en,
      mainCraft: mainCraftName,
      mainCraftEn: mainCraft.name_en,
      additionalCrafts: additionalCrafts.map(
        (craft) => craft.name_ar || craft.name_en
      ),
      bio,
      story,
      profileImage: artisan.profile_image_url,
      video: artisan.video_url,
      searchTerms: [
        name,
        artisan.name_en,
        countryName,
        country.name_en,
        region,
        artisan.region_en || "",
        mainCraftName,
        mainCraft.name_en,
        ...additionalCrafts.flatMap((craft) => [
          craft.name_ar || craft.name_en,
          craft.name_en,
        ]),
        bio,
        artisan.bio_en || "",
        story,
        artisan.story_en || "",
      ].filter(Boolean),
    };
  });

  const artisanMap = new Map(artisans.map((artisan) => [artisan.id, artisan]));
  const accents: Product["accent"][] = ["terracotta", "olive", "copper"];

  const products: PublicCatalogProduct[] = productRows
    .filter(
      (product) =>
        artisanMap.has(product.artisan_id) && craftMap.has(product.primary_craft_id)
    )
    .map((product, index) => {
      const artisan = artisanMap.get(product.artisan_id)!;
      const craft = craftMap.get(product.primary_craft_id)!;
      const name = product.name_ar || product.name_en;
      const description = product.description_ar || product.description_en || "";
      const material = product.material_ar || product.material_en || "";
      const story = product.story_ar || product.story_en || "";

      return {
        id: product.id,
        slug: product.slug,
        artisanSlug: artisan.slug,
        name,
        artisan: artisan.name,
        country: artisan.country,
        price: Number(product.price),
        category: craft.name_en,
        accent: accents[index % accents.length],
        origin: artisan.region,
        artisanRole: `${craft.name_en} artisan`,
        objectLabel: craft.name_en,
        description,
        material,
        story,
        status: "approved",
        dimensions: product.dimensions || undefined,
        weight: product.weight || undefined,
        madeToOrder: product.made_to_order,
        preparationTime: product.preparation_time || undefined,
        oneOfAKind: product.one_of_a_kind,
        customization: product.customization,
        quantity: product.quantity,
        searchTerms: [
          name,
          product.name_en,
          artisan.name,
          artisan.nameEn,
          artisan.country,
          artisan.countryEn,
          artisan.region,
          artisan.regionEn,
          craft.name_ar || craft.name_en,
          craft.name_en,
          description,
          product.description_en || "",
          material,
          product.material_en || "",
          story,
          product.story_en || "",
        ].filter(Boolean),
      };
    });

  const countryCraftIds = new Map<string, Set<string>>();
  for (const artisan of visibleArtisanRows) {
    const craftIds = countryCraftIds.get(artisan.country_id) ?? new Set<string>();
    craftIds.add(artisan.primary_craft_id);
    for (const craftId of craftIdsByArtisan.get(artisan.id) ?? []) {
      craftIds.add(craftId);
    }
    countryCraftIds.set(artisan.country_id, craftIds);
  }

  const countries: PublicCatalogCountry[] = countryRows.map((country) => {
    const editorial = publicCountries[country.slug];
    const relatedCrafts = [...(countryCraftIds.get(country.id) ?? [])]
      .map((craftId) => craftMap.get(craftId))
      .filter((craft): craft is DbCraft => Boolean(craft));
    const craftOptions = relatedCrafts.map((craft) => ({
      label: craft.name_ar || craft.name_en,
      value: craft.name_en,
    }));

    return {
      id: country.id,
      slug: country.slug,
      name: country.name_ar || country.name_en,
      nameEn: country.name_en,
      heroImage: editorial?.heroImage,
      culturalDescription: editorial?.culturalDescription,
      culturalVideo: editorial?.culturalVideo,
      crafts: craftOptions.map((craft) => craft.label),
      craftOptions,
      searchTerms: [
        country.name_ar || country.name_en,
        country.name_en,
        editorial?.culturalDescription || "",
        ...relatedCrafts.flatMap((craft) => [
          craft.name_ar || craft.name_en,
          craft.name_en,
        ]),
      ].filter(Boolean),
    };
  });

  const crafts: PublicCatalogCraft[] = craftRows.map((craft) => ({
    id: craft.id,
    slug: craft.slug,
    name: craft.name_ar || craft.name_en,
    nameEn: craft.name_en,
    searchTerms: [craft.name_ar || craft.name_en, craft.name_en].filter(Boolean),
  }));

  return { countries, crafts, artisans, products };
}

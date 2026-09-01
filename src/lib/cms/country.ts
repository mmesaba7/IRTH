export type CountryContentPayload = {
  schemaVersion: 1;
  countryId: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  summaryAr: string;
  summaryEn: string;
  coverImageAssetId: string | null;
  culturalImageAssetIds: string[];
  seo: {
    titleAr: string;
    titleEn: string;
    metaDescriptionAr: string;
    metaDescriptionEn: string;
    ogImageAssetId: string | null;
  };
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= max ? text : null;
}

function optionalText(value: unknown, max: number): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text) return null;
  return text.length <= max ? text : undefined;
}

function optionalAssetId(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" && UUID_RE.test(value) ? value : undefined;
}

export function countryContentDocumentKey(slug: string) {
  return `country:${slug}`;
}

export function parseCountryContentPayload(value: unknown): CountryContentPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;

  const countryId = typeof record.countryId === "string" && UUID_RE.test(record.countryId) ? record.countryId : null;
  const slug = requiredText(record.slug, 80);
  const nameAr = requiredText(record.nameAr, 160);
  const nameEn = requiredText(record.nameEn, 160);
  const summaryAr = requiredText(record.summaryAr, 4000);
  const summaryEn = requiredText(record.summaryEn, 4000);
  const coverImageAssetId = optionalAssetId(record.coverImageAssetId);

  if (!countryId || !slug || !SLUG_RE.test(slug) || !nameAr || !nameEn || !summaryAr || !summaryEn || coverImageAssetId === undefined) {
    return null;
  }

  if (!Array.isArray(record.culturalImageAssetIds)) return null;
  const culturalImageAssetIds: string[] = [];
  const seen = new Set<string>();
  for (const value of record.culturalImageAssetIds) {
    if (typeof value !== "string" || !UUID_RE.test(value) || seen.has(value)) return null;
    seen.add(value);
    culturalImageAssetIds.push(value);
  }

  const seoRecord = record.seo && typeof record.seo === "object" && !Array.isArray(record.seo)
    ? record.seo as Record<string, unknown>
    : {};

  const optionalSeoTitleAr = optionalText(seoRecord.titleAr, 180);
  const optionalSeoTitleEn = optionalText(seoRecord.titleEn, 180);
  const optionalMetaDescriptionAr = optionalText(seoRecord.metaDescriptionAr, 320);
  const optionalMetaDescriptionEn = optionalText(seoRecord.metaDescriptionEn, 320);
  const ogImageAssetId = optionalAssetId(seoRecord.ogImageAssetId);

  if (
    optionalSeoTitleAr === undefined ||
    optionalSeoTitleEn === undefined ||
    optionalMetaDescriptionAr === undefined ||
    optionalMetaDescriptionEn === undefined ||
    ogImageAssetId === undefined
  ) {
    return null;
  }

  return {
    schemaVersion: 1,
    countryId,
    slug,
    nameAr,
    nameEn,
    summaryAr,
    summaryEn,
    coverImageAssetId,
    culturalImageAssetIds,
    seo: {
      titleAr: optionalSeoTitleAr ?? nameAr,
      titleEn: optionalSeoTitleEn ?? nameEn,
      metaDescriptionAr: optionalMetaDescriptionAr ?? summaryAr.slice(0, 320),
      metaDescriptionEn: optionalMetaDescriptionEn ?? summaryEn.slice(0, 320),
      ogImageAssetId,
    },
  };
}

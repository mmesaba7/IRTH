export type BlogPayload = {
  schemaVersion: 1;
  slug: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  bodyAr: string;
  bodyEn: string;
  coverImageAssetId: string | null;
  seo: {
    titleAr: string;
    titleEn: string;
    metaDescriptionAr: string;
    metaDescriptionEn: string;
    canonicalUrl: string | null;
    ogTitleAr: string;
    ogTitleEn: string;
    ogDescriptionAr: string;
    ogDescriptionEn: string;
    ogImageAssetId: string | null;
  };
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanRequired(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > max) return null;
  return cleaned;
}

function cleanOptional(value: unknown, max: number): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.length > max) return undefined;
  return cleaned;
}

function cleanAssetId(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  if (!UUID_RE.test(cleaned)) return undefined;
  return cleaned;
}

export function parseBlogPayload(value: unknown): BlogPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;

  const slug = cleanRequired(record.slug, 80);
  const titleAr = cleanRequired(record.titleAr, 180);
  const titleEn = cleanRequired(record.titleEn, 180);
  const excerptAr = cleanRequired(record.excerptAr, 500);
  const excerptEn = cleanRequired(record.excerptEn, 500);
  const bodyAr = cleanRequired(record.bodyAr, 20000);
  const bodyEn = cleanRequired(record.bodyEn, 20000);
  const coverImageAssetId = cleanAssetId(record.coverImageAssetId);

  if (
    !slug ||
    !SLUG_RE.test(slug) ||
    !titleAr ||
    !titleEn ||
    !excerptAr ||
    !excerptEn ||
    !bodyAr ||
    !bodyEn ||
    coverImageAssetId === undefined
  ) {
    return null;
  }

  const seoRecord =
    record.seo && typeof record.seo === "object" && !Array.isArray(record.seo)
      ? (record.seo as Record<string, unknown>)
      : {};

  const seoTitleAr = cleanOptional(seoRecord.titleAr, 180);
  const seoTitleEn = cleanOptional(seoRecord.titleEn, 180);
  const metaDescriptionAr = cleanOptional(seoRecord.metaDescriptionAr, 320);
  const metaDescriptionEn = cleanOptional(seoRecord.metaDescriptionEn, 320);
  const canonicalUrl = cleanOptional(seoRecord.canonicalUrl, 500);
  const ogTitleAr = cleanOptional(seoRecord.ogTitleAr, 180);
  const ogTitleEn = cleanOptional(seoRecord.ogTitleEn, 180);
  const ogDescriptionAr = cleanOptional(seoRecord.ogDescriptionAr, 320);
  const ogDescriptionEn = cleanOptional(seoRecord.ogDescriptionEn, 320);
  const ogImageAssetId = cleanAssetId(seoRecord.ogImageAssetId);

  if (
    seoTitleAr === undefined ||
    seoTitleEn === undefined ||
    metaDescriptionAr === undefined ||
    metaDescriptionEn === undefined ||
    canonicalUrl === undefined ||
    ogTitleAr === undefined ||
    ogTitleEn === undefined ||
    ogDescriptionAr === undefined ||
    ogDescriptionEn === undefined ||
    ogImageAssetId === undefined
  ) {
    return null;
  }

  return {
    schemaVersion: 1,
    slug,
    titleAr,
    titleEn,
    excerptAr,
    excerptEn,
    bodyAr,
    bodyEn,
    coverImageAssetId,
    seo: {
      titleAr: seoTitleAr ?? titleAr,
      titleEn: seoTitleEn ?? titleEn,
      metaDescriptionAr: metaDescriptionAr ?? excerptAr,
      metaDescriptionEn: metaDescriptionEn ?? excerptEn,
      canonicalUrl,
      ogTitleAr: ogTitleAr ?? titleAr,
      ogTitleEn: ogTitleEn ?? titleEn,
      ogDescriptionAr: ogDescriptionAr ?? excerptAr,
      ogDescriptionEn: ogDescriptionEn ?? excerptEn,
      ogImageAssetId,
    },
  };
}

export function normalizeStoredBlogPayload(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    ...record,
    coverImageAssetId:
      typeof record.coverImageAssetId === "string" ? record.coverImageAssetId : null,
    seo:
      record.seo && typeof record.seo === "object" && !Array.isArray(record.seo)
        ? {
            ...(record.seo as Record<string, unknown>),
            ogImageAssetId:
              typeof (record.seo as Record<string, unknown>).ogImageAssetId === "string"
                ? (record.seo as Record<string, unknown>).ogImageAssetId
                : null,
          }
        : {},
  };
}

export function blogDocumentKey(slug: string) {
  return `blog:${slug}`;
}

export type StaticPagePayload = {
  schemaVersion: 1;
  slug: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  seo: {
    titleAr: string;
    titleEn: string;
    metaDescriptionAr: string;
    metaDescriptionEn: string;
    canonicalUrl: string | null;
  };
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function required(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned && cleaned.length <= max ? cleaned : null;
}

function optional(value: unknown, max: number): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.length <= max ? cleaned : undefined;
}

export function staticPageDocumentKey(slug: string) {
  return `page:${slug}`;
}

export function parseStaticPagePayload(value: unknown): StaticPagePayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;

  const slug = required(record.slug, 80);
  const titleAr = required(record.titleAr, 180);
  const titleEn = required(record.titleEn, 180);
  const bodyAr = required(record.bodyAr, 30000);
  const bodyEn = required(record.bodyEn, 30000);

  if (!slug || !SLUG_RE.test(slug) || !titleAr || !titleEn || !bodyAr || !bodyEn) return null;

  const seoRecord = record.seo && typeof record.seo === "object" && !Array.isArray(record.seo)
    ? (record.seo as Record<string, unknown>)
    : {};

  const seoTitleAr = optional(seoRecord.titleAr, 180);
  const seoTitleEn = optional(seoRecord.titleEn, 180);
  const metaDescriptionAr = optional(seoRecord.metaDescriptionAr, 320);
  const metaDescriptionEn = optional(seoRecord.metaDescriptionEn, 320);
  const canonicalUrl = optional(seoRecord.canonicalUrl, 500);

  if (
    seoTitleAr === undefined ||
    seoTitleEn === undefined ||
    metaDescriptionAr === undefined ||
    metaDescriptionEn === undefined ||
    canonicalUrl === undefined
  ) return null;

  const fallbackAr = bodyAr.slice(0, 300);
  const fallbackEn = bodyEn.slice(0, 300);

  return {
    schemaVersion: 1,
    slug,
    titleAr,
    titleEn,
    bodyAr,
    bodyEn,
    seo: {
      titleAr: seoTitleAr ?? titleAr,
      titleEn: seoTitleEn ?? titleEn,
      metaDescriptionAr: metaDescriptionAr ?? fallbackAr,
      metaDescriptionEn: metaDescriptionEn ?? fallbackEn,
      canonicalUrl,
    },
  };
}

export const CAMPAIGN_DOCUMENT_KEY = "campaign:main";

export type CampaignPayload = {
  schemaVersion: 1;
  active: boolean;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  ctaLabelAr: string | null;
  ctaLabelEn: string | null;
  ctaUrl: string | null;
  startAt: string;
  endAt: string;
  backgroundImageAssetId: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredText(value: unknown, max: number): string | null {
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

function parseIso(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseCtaUrl(value: unknown): string | null | undefined {
  const text = optionalText(value, 500);
  if (text === undefined || text === null) return text;
  if (text.startsWith("/") && !text.startsWith("//")) return text;
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function parseCampaignPayload(value: unknown): CampaignPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1 || typeof record.active !== "boolean") return null;

  const titleAr = requiredText(record.titleAr, 180);
  const titleEn = requiredText(record.titleEn, 180);
  const bodyAr = requiredText(record.bodyAr, 1200);
  const bodyEn = requiredText(record.bodyEn, 1200);
  const ctaLabelAr = optionalText(record.ctaLabelAr, 120);
  const ctaLabelEn = optionalText(record.ctaLabelEn, 120);
  const ctaUrl = parseCtaUrl(record.ctaUrl);
  const startAt = parseIso(record.startAt);
  const endAt = parseIso(record.endAt);

  let backgroundImageAssetId: string | null = null;
  if (record.backgroundImageAssetId !== null && record.backgroundImageAssetId !== undefined && record.backgroundImageAssetId !== "") {
    if (typeof record.backgroundImageAssetId !== "string" || !UUID_RE.test(record.backgroundImageAssetId)) return null;
    backgroundImageAssetId = record.backgroundImageAssetId;
  }

  if (!titleAr || !titleEn || !bodyAr || !bodyEn || ctaLabelAr === undefined || ctaLabelEn === undefined || ctaUrl === undefined || !startAt || !endAt) return null;
  if (new Date(endAt).getTime() <= new Date(startAt).getTime()) return null;

  const hasAnyCta = Boolean(ctaLabelAr || ctaLabelEn || ctaUrl);
  const hasCompleteCta = Boolean(ctaLabelAr && ctaLabelEn && ctaUrl);
  if (hasAnyCta !== hasCompleteCta) return null;

  return {
    schemaVersion: 1,
    active: record.active,
    titleAr,
    titleEn,
    bodyAr,
    bodyEn,
    ctaLabelAr,
    ctaLabelEn,
    ctaUrl,
    startAt,
    endAt,
    backgroundImageAssetId,
  };
}

export function isCampaignLive(payload: CampaignPayload, now = new Date()) {
  const time = now.getTime();
  return payload.active && time >= new Date(payload.startAt).getTime() && time < new Date(payload.endAt).getTime();
}

export const FOOTER_DOCUMENT_KEY = "footer:main";
export const FOOTER_GROUPS = ["shop", "about", "help", "legal"] as const;
export type FooterGroup = typeof FOOTER_GROUPS[number];
export type FooterLinkItem = { id: string; labelAr: string; labelEn: string; url: string; group: FooterGroup; visible: boolean; newTab: boolean };
export type FooterPayload = { schemaVersion: 1; summaryAr: string; summaryEn: string; copyrightAr: string; copyrightEn: string; links: FooterLinkItem[] };

const text = (v: unknown, max: number) => typeof v === "string" && v.trim() && v.trim().length <= max ? v.trim() : null;
export function parseFooterPayload(value: unknown): FooterPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (source.schemaVersion !== 1 || !Array.isArray(source.links) || source.links.length > 60) return null;
  const summaryAr = text(source.summaryAr, 600), summaryEn = text(source.summaryEn, 600), copyrightAr = text(source.copyrightAr, 240), copyrightEn = text(source.copyrightEn, 240);
  if (!summaryAr || !summaryEn || !copyrightAr || !copyrightEn) return null;
  const ids = new Set<string>(); const links: FooterLinkItem[] = [];
  for (const raw of source.links) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const row = raw as Record<string, unknown>;
    const id = text(row.id, 80), labelAr = text(row.labelAr, 120), labelEn = text(row.labelEn, 120), url = text(row.url, 500);
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id) || !labelAr || !labelEn || !url || !/^(https?:\/\/|mailto:|tel:|\/)/i.test(url) || !FOOTER_GROUPS.includes(row.group as FooterGroup) || typeof row.visible !== "boolean" || typeof row.newTab !== "boolean") return null;
    ids.add(id); links.push({ id, labelAr, labelEn, url, group: row.group as FooterGroup, visible: row.visible, newTab: row.newTab });
  }
  return { schemaVersion: 1, summaryAr, summaryEn, copyrightAr, copyrightEn, links };
}
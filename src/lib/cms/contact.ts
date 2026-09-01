export const CONTACT_DOCUMENT_KEY = "contact:main";

export type ContactItem = { id: string; labelAr: string; labelEn: string; value: string; url: string };
export type ContactPayload = { schemaVersion: 1; titleAr: string; titleEn: string; introAr: string; introEn: string; items: ContactItem[] };

const text = (v: unknown, max: number, required = true) => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if ((required && !s) || s.length > max) return null;
  return s;
};

export function parseContactPayload(value: unknown): ContactPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (source.schemaVersion !== 1 || !Array.isArray(source.items) || source.items.length > 20) return null;
  const titleAr = text(source.titleAr, 160), titleEn = text(source.titleEn, 160), introAr = text(source.introAr, 1500), introEn = text(source.introEn, 1500);
  if (!titleAr || !titleEn || !introAr || !introEn) return null;
  const ids = new Set<string>();
  const items: ContactItem[] = [];
  for (const raw of source.items) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const row = raw as Record<string, unknown>;
    const id = text(row.id, 80), labelAr = text(row.labelAr, 120), labelEn = text(row.labelEn, 120), itemValue = text(row.value, 300), url = text(row.url, 500, false);
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id) || !labelAr || !labelEn || !itemValue || url === null) return null;
    if (url && !/^(https?:\/\/|mailto:|tel:|\/)/i.test(url)) return null;
    ids.add(id); items.push({ id, labelAr, labelEn, value: itemValue, url });
  }
  return { schemaVersion: 1, titleAr, titleEn, introAr, introEn, items };
}
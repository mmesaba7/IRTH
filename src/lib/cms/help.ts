export const HELP_DOCUMENT_KEY = "help:main";

export type HelpFaqItem = {
  id: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
};

export type HelpPayload = {
  schemaVersion: 1;
  titleAr: string;
  titleEn: string;
  introAr: string;
  introEn: string;
  faqs: HelpFaqItem[];
};

function text(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result && result.length <= max ? result : null;
}

export function parseHelpPayload(value: unknown): HelpPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (source.schemaVersion !== 1 || !Array.isArray(source.faqs) || source.faqs.length > 100) return null;

  const titleAr = text(source.titleAr, 160);
  const titleEn = text(source.titleEn, 160);
  const introAr = text(source.introAr, 1000);
  const introEn = text(source.introEn, 1000);
  if (!titleAr || !titleEn || !introAr || !introEn) return null;

  const ids = new Set<string>();
  const faqs: HelpFaqItem[] = [];
  for (const item of source.faqs) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const questionAr = text(row.questionAr, 300);
    const questionEn = text(row.questionEn, 300);
    const answerAr = text(row.answerAr, 5000);
    const answerEn = text(row.answerEn, 5000);
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || ids.has(id) || !questionAr || !questionEn || !answerAr || !answerEn) return null;
    ids.add(id);
    faqs.push({ id, questionAr, questionEn, answerAr, answerEn });
  }

  return { schemaVersion: 1, titleAr, titleEn, introAr, introEn, faqs };
}
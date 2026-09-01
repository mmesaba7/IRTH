"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { FooterPayload } from "@/lib/cms/footer";

const GROUP_LABELS: Record<string, { ar: string; en: string }> = { shop: { ar: "التسوق", en: "Shop" }, about: { ar: "عن إرث", en: "About" }, help: { ar: "المساعدة", en: "Help" }, legal: { ar: "قانوني", en: "Legal" } };

export default function SiteFooter() {
  const pathname = usePathname();
  const [footer, setFooter] = useState<FooterPayload | null>(null);
  useEffect(() => { fetch("/api/footer", { cache: "no-store" }).then(async (r) => r.ok ? r.json() : null).then((b) => { if (b?.footer) setFooter(b.footer); }).catch(() => undefined); }, []);
  if (pathname.startsWith("/dashboard-admin") || !footer) return null;
  const groups = ["shop", "about", "help", "legal"];
  return <footer className="bg-[var(--color-espresso)] text-[var(--color-ivory)]"><div className="mx-auto max-w-[var(--container-max)] px-5 py-12 md:px-6 md:py-16"><div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]"><div><p className="font-[var(--font-display)] text-3xl">IRTH</p><p dir="rtl" className="mt-4 text-sm leading-7 text-[var(--color-ivory)]/70">{footer.summaryAr}</p><p dir="ltr" className="mt-3 text-sm leading-7 text-[var(--color-ivory)]/55">{footer.summaryEn}</p></div>{groups.map((group) => { const links = footer.links.filter((link) => link.visible && link.group === group); if (!links.length) return null; return <div key={group}><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-antique-gold)]">{GROUP_LABELS[group].ar} / {GROUP_LABELS[group].en}</p><div className="mt-4 space-y-3">{links.map((link) => <a key={link.id} href={link.url} target={link.newTab ? "_blank" : undefined} rel={link.newTab ? "noreferrer" : undefined} className="block text-sm text-[var(--color-ivory)]/70 hover:text-[var(--color-ivory)]"><span dir="rtl">{link.labelAr}</span><span className="mx-1">/</span><span dir="ltr">{link.labelEn}</span></a>)}</div></div>; })}</div><div className="mt-10 grid gap-2 border-t border-[var(--color-ivory)]/10 pt-6 text-xs text-[var(--color-ivory)]/50 md:grid-cols-2"><p dir="rtl">{footer.copyrightAr}</p><p dir="ltr" className="md:text-right">{footer.copyrightEn}</p></div></div></footer>;
}
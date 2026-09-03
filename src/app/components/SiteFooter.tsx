"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { FooterPayload } from "@/lib/cms/footer";

const GROUP_LABELS: Record<string, { ar: string; en: string }> = {
  shop: { ar: "التسوق", en: "Shop" },
  about: { ar: "عن إرث", en: "About" },
  help: { ar: "المساعدة", en: "Help" },
  legal: { ar: "قانوني", en: "Legal" },
};

export default function SiteFooter() {
  const pathname = usePathname();
  const [footer, setFooter] = useState<FooterPayload | null>(null);

  useEffect(() => {
    fetch("/api/footer", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((body) => { if (body?.footer) setFooter(body.footer); })
      .catch(() => undefined);
  }, []);

  if (pathname.startsWith("/dashboard-admin") || !footer) return null;

  const groups = ["shop", "about", "help", "legal"];

  return (
    <footer className="relative overflow-hidden bg-[var(--color-petrol-deep)] text-[var(--color-ivory)]">
      <div className="irth-pattern absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-25" />
      <div className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
        <div className="relative grid gap-12 border-b border-white/10 pb-12 md:grid-cols-[1.45fr_repeat(4,1fr)] md:pb-16">
          <div className="max-w-sm">
            <p className="font-[var(--font-display)] text-4xl font-semibold tracking-[0.1em] text-[#fff5df]">IRTH</p>
            <div className="mt-4 h-px w-14 bg-[var(--color-antique-gold)]" />
            <p dir="rtl" className="mt-5 text-sm leading-7 text-[var(--color-ivory)]/72">{footer.summaryAr}</p>
            <p dir="ltr" className="mt-3 text-sm leading-7 text-[var(--color-ivory)]/52">{footer.summaryEn}</p>
          </div>

          {groups.map((group) => {
            const links = footer.links.filter((link) => link.visible && link.group === group);
            if (!links.length) return null;
            return (
              <div key={group}>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-antique-gold)]">
                  {GROUP_LABELS[group].ar} / {GROUP_LABELS[group].en}
                </p>
                <div className="mt-5 space-y-3.5">
                  {links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target={link.newTab ? "_blank" : undefined}
                      rel={link.newTab ? "noreferrer" : undefined}
                      className="block text-sm text-[var(--color-ivory)]/64 transition hover:text-[var(--color-ivory)]"
                    >
                      <span dir="rtl">{link.labelAr}</span><span className="mx-1 opacity-35">/</span><span dir="ltr">{link.labelEn}</span>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative mt-7 grid gap-2 text-xs text-[var(--color-ivory)]/42 md:grid-cols-2">
          <p dir="rtl">{footer.copyrightAr}</p>
          <p dir="ltr" className="md:text-right">{footer.copyrightEn}</p>
        </div>
      </div>
    </footer>
  );
}

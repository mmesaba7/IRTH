"use client";

import { useEffect } from "react";
import SiteFooter from "./SiteFooter";

export default function ClientRootShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const savedLocale = localStorage.getItem("irth-locale") as "ar" | "en" | null;
    const locale = savedLocale ?? (navigator.language.startsWith("ar") ? "ar" : "en");
    if (!savedLocale) localStorage.setItem("irth-locale", locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, []);

  return (
    <>
      {children}
      <SiteFooter />
    </>
  );
}

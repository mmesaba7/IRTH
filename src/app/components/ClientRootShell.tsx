"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import SiteFooter from "./SiteFooter";

const artisanPortalPrefixes = [
  "/artisan/dashboard",
  "/artisan/orders",
  "/artisan/payouts",
  "/artisan/products",
  "/artisan/promotions",
  "/artisan/reviews",
];

export default function ClientRootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const savedLocale = localStorage.getItem("irth-locale") as "ar" | "en" | null;
    const locale = savedLocale ?? (navigator.language.startsWith("ar") ? "ar" : "en");
    if (!savedLocale) localStorage.setItem("irth-locale", locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, []);

  const isArtisanPortal =
    pathname === "/artisan/login" ||
    artisanPortalPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
  const hideStorefrontFooter = pathname.startsWith("/dashboard-admin") || isArtisanPortal;

  return (
    <>
      {children}
      {!hideStorefrontFooter && <SiteFooter />}
    </>
  );
}

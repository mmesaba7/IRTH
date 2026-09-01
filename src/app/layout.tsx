"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useEffect, useState } from "react";
import SiteFooter from "./components/SiteFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const [direction, setDirection] = useState<"rtl" | "ltr">("rtl");

  useEffect(() => {
    const savedLocale = localStorage.getItem("irth-locale") as "ar" | "en" | null;
    if (savedLocale) {
      setLocale(savedLocale);
      setDirection(savedLocale === "ar" ? "rtl" : "ltr");
    } else {
      const browserLang = navigator.language.startsWith("ar") ? "ar" : "en";
      setLocale(browserLang);
      setDirection(browserLang === "ar" ? "rtl" : "ltr");
      localStorage.setItem("irth-locale", browserLang);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/cms/brand", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = await response.json();
        const value = body?.assets?.faviconAssetId;
        return typeof value === "string" ? value : null;
      })
      .then((faviconUrl) => {
        if (cancelled || !faviconUrl) return;
        let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!icon) {
          icon = document.createElement("link");
          icon.rel = "icon";
          document.head.appendChild(icon);
        }
        icon.href = faviconUrl;
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, []);

  return (
    <html lang={locale} dir={direction}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}

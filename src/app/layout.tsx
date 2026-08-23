"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useEffect, useState } from "react";

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
  // هنا هنخزن اللغة المختارة
  const [locale, setLocale] = useState<"ar" | "en">("ar"); // العربية هي الافتراضي
  const [direction, setDirection] = useState<"rtl" | "ltr">("rtl");

  useEffect(() => {
    // نجيب اللغة المحفوظة في المتصفح (لو فيه)
    const savedLocale = localStorage.getItem("irth-locale") as "ar" | "en" | null;
    if (savedLocale) {
      setLocale(savedLocale);
      setDirection(savedLocale === "ar" ? "rtl" : "ltr");
    } else {
      // لو مفيش، نشوف لغة المتصفح
      const browserLang = navigator.language.startsWith("ar") ? "ar" : "en";
      setLocale(browserLang);
      setDirection(browserLang === "ar" ? "rtl" : "ltr");
      localStorage.setItem("irth-locale", browserLang);
    }
  }, []);

  return (
    <html lang={locale} dir={direction}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
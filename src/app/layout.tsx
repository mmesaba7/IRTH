import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Geist,
  Geist_Mono,
  Noto_Naskh_Arabic,
  Noto_Sans_Arabic,
} from "next/font/google";
import "./globals.css";
import ClientRootShell from "./components/ClientRootShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const latinDisplay = Cormorant_Garamond({
  variable: "--font-latin-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const arabicDisplay = Noto_Naskh_Arabic({
  variable: "--font-arabic-display",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

const arabicBody = Noto_Sans_Arabic({
  variable: "--font-arabic-body",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "IRTH | إرث",
    template: "%s | IRTH",
  },
  description: "IRTH is a marketplace for authentic crafts, artisans, and heritage.",
  openGraph: {
    type: "website",
    siteName: "IRTH",
    title: "IRTH | إرث",
    description: "A marketplace for authentic crafts, artisans, and heritage.",
    images: ["/api/cms/brand/social-image"],
  },
  icons: {
    icon: "/api/cms/brand/favicon",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${latinDisplay.variable} ${arabicDisplay.variable} ${arabicBody.variable} antialiased`}
      >
        <ClientRootShell>{children}</ClientRootShell>
      </body>
    </html>
  );
}

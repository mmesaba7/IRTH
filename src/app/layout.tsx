import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientRootShell>{children}</ClientRootShell>
      </body>
    </html>
  );
}

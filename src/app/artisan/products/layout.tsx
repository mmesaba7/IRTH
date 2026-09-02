"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ArtisanProductsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const showAddProduct = pathname === "/artisan/products";

  return (
    <>
      {children}
      {showAddProduct && (
        <Link
          href="/artisan/products/new"
          className="fixed bottom-5 right-5 z-40 rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-5 py-3 text-sm font-medium text-[var(--color-ivory)] shadow-lg transition hover:bg-[var(--color-copper)] sm:bottom-7 sm:right-7"
        >
          + إضافة منتج جديد
        </Link>
      )}
    </>
  );
}

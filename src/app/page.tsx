"use client";

import { useState, useEffect } from "react";
import ProductCard from "./components/ProductCard";
import { products } from "./data/products";
import Header from "./components/Header";
import Link from "next/link";

type Product = {
  slug: string;
  artisanSlug: string;
  name: string;
  artisan: string;
  country: string;
  price: number;
  category: string;
  accent: "terracotta" | "olive" | "copper";
  origin: string;
  artisanRole: string;
  objectLabel: string;
  description: string;
  material: string;
  story: string;
  status?: "pending" | "approved" | "rejected";
};

export default function HomePage() {
  const [cartCount, setCartCount] = useState(0);
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // دالة تحميل المنتجات (نفسها بس هنناديها من كذا مكان)
  const loadProducts = () => {
    const baseProducts = Object.values(products);
    const storedProducts = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    ).filter((p: Product) => p.status === "approved");

    const allProducts = [...baseProducts, ...storedProducts];
    const uniqueProducts = allProducts.filter(
      (product, index, self) =>
        index === self.findIndex((p) => p.slug === product.slug)
    );

    setProductList(uniqueProducts);
    setLoading(false);
  };

  useEffect(() => {
    // تحديث عدد العربة
    const updateCount = () => {
      const cart = JSON.parse(localStorage.getItem("irth-cart") || "[]");
      setCartCount(cart.length);
    };

    updateCount();
    loadProducts();

    // 👇 الاستماع لأي تغيير في localStorage من أي تبويب
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "irth-artisan-products") {
        loadProducts(); // تحديث المنتجات
      }
      if (e.key === "irth-cart") {
        updateCount(); // تحديث عدد العربة
      }
    };

    // 👇 الاستماع لأي تغيير داخل نفس التبويب (زي الموافقة من admin)
    const handleCustomEvent = () => {
      loadProducts();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("irth-products-updated", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("irth-products-updated", handleCustomEvent);
    };
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p>جاري التحميل...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] pb-24">
      <Header />

      {/* Hero Section مع الزخرفة التراثية */}
      <section className="relative overflow-hidden bg-[var(--color-espresso)] text-[var(--color-ivory)] px-5 py-16 md:py-24">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-20 h-20 border border-[var(--color-copper)]/30 rounded-full" />
          <div className="absolute bottom-10 right-10 w-16 h-16 border border-[var(--color-copper)]/20 rotate-45" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-[var(--color-copper)]/10 rounded-full" />
        </div>

        <div className="mx-auto max-w-[var(--container-max)] text-center md:text-left relative z-10">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-copper)]">
            Heritage · Craft · Human
          </p>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl md:text-6xl lg:text-7xl leading-[1.05]">
            Discover the hands<br />behind the heritage.
          </h1>
          <p className="mt-6 max-w-2xl text-base md:text-lg text-[var(--color-ivory)]/70">
            Explore authentic handmade crafts, meet the artisans, and discover
            the cultures that keep heritage alive.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/crafts" className="btn-primary">
              Explore crafts
            </Link>
            <Link href="/artisans" className="btn-secondary border-white/20 text-white">
              Meet artisans
            </Link>
          </div>
        </div>
      </section>

      {/* المنتجات المميزة */}
      <section className="mx-auto max-w-[var(--container-max)] px-5 py-12 md:py-16">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Featured
            </p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl md:text-5xl text-[var(--color-espresso)]">
              Stories you can take home.
            </h2>
          </div>
          <Link href="/crafts" className="text-sm text-[var(--color-copper)] hover:underline">
            View all →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {productList.map((product) => (
            <ProductCard key={product.slug} slug={product.slug} />
          ))}
        </div>
      </section>

      {/* Bottom Navigation (للجوال) */}
      <nav className="bottom-nav md:hidden">
        <Link href="/" className="active">
          <span>🏠</span> Home
        </Link>
        <Link href="/search">
          <span>🔎</span> Search
        </Link>
        <Link href="/explore">
          <span>🧭</span> Explore
        </Link>
        <Link href="/saved">
          <span>❤️</span> Saved
        </Link>
        <Link href="/account">
          <span>👤</span> Account
        </Link>
      </nav>
    </main>
  );
}
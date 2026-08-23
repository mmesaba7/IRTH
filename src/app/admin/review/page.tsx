"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";

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
  status: "pending" | "approved" | "rejected";
};

export default function AdminReviewPage() {
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);

  const loadPending = () => {
    const allProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );
    const pending = allProducts.filter((p) => p.status === "pending");
    setPendingProducts(pending);
  };

  const handleReview = (slug: string, action: "approved" | "rejected") => {
    const allProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );
    const updated = allProducts.map((p) =>
      p.slug === slug ? { ...p, status: action } : p
    );
    localStorage.setItem("irth-artisan-products", JSON.stringify(updated));
    
    // 🔥 أهم إضافة: إرسال إشارة تحديث للصفحة الرئيسية
    window.dispatchEvent(new Event("irth-products-updated"));
    
    loadPending(); // تحديث قائمة المراجعة
  };

  useEffect(() => {
    loadPending();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10">
        <h1 className="font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
          📋 مراجعة المنتجات
        </h1>
        <p className="text-[var(--text-secondary)]">وافق أو ارفض المنتجات الجديدة</p>

        {pendingProducts.length === 0 ? (
          <p className="mt-10 text-[var(--text-muted)]">🎉 مفيش منتجات في انتظار المراجعة</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pendingProducts.map((product) => (
              <div
                key={product.slug}
                className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5"
              >
                <h3 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
                  {product.name}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {product.artisan} - {product.country}
                </p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  {product.description.slice(0, 80)}...
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleReview(product.slug, "approved")}
                    className="flex-1 rounded-[var(--radius-md)] bg-green-600 px-4 py-2 text-sm text-white transition hover:bg-green-700"
                  >
                    ✅ موافقة
                  </button>
                  <button
                    onClick={() => handleReview(product.slug, "rejected")}
                    className="flex-1 rounded-[var(--radius-md)] bg-red-500 px-4 py-2 text-sm text-white transition hover:bg-red-600"
                  >
                    ❌ رفض
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
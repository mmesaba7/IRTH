"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import Link from "next/link";

// تعريف شكل المنتج (نفس اللي في data/products.ts)
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
  status: "pending" | "approved" | "rejected"; // ← جديد
};

export default function ArtisanProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // اسم الحرفي الحالي (مؤقت)
  const artisanName = "Ahmed Hassan";

  // دالة لجلب المنتجات
  const loadProducts = () => {
    // نجيب المنتجات من localStorage (المنتجات الجديدة اللي هنضيفها)
    const storedProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );

    // نجيب المنتجات الأساسية من ملف البيانات (اللي موجودة في data/products.ts)
    // هنا هنفلتر عشان نجيب بس منتجات الحرفي ده
    import("../../data/products").then((module) => {
      const baseProducts = Object.values(module.products).filter(
        (p) => p.artisan === artisanName
      );

      // ندمج المنتجات الأساسية مع المنتجات الجديدة (مع تجنب التكرار)
      const allProducts = [...baseProducts, ...storedProducts];
      // نزيل أي منتج مكرر بناءً على الـ slug
      const uniqueProducts = allProducts.filter(
        (product, index, self) =>
          index === self.findIndex((p) => p.slug === product.slug)
      );

      setProducts(uniqueProducts);
      setLoading(false);
    });
  };

  // دالة حذف المنتج
  const handleDelete = (slug: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;

    // نجيب المنتجات المخزنة
    const storedProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );

    // نفلتر عشان نشيل المنتج المطلوب
    const updated = storedProducts.filter((p) => p.slug !== slug);

    // نحفظ التغييرات
    localStorage.setItem("irth-artisan-products", JSON.stringify(updated));

    // نحدث الحالة (state)
    setProducts(updated);
  };

  // أول ما الصفحة تتحمل، نجيب المنتجات
  useEffect(() => {
    // نتأكد من تسجيل الدخول
    const isAuth = localStorage.getItem("irth-artisan-auth");
    if (!isAuth) {
      router.push("/artisan/login");
      return;
    }
    loadProducts();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري تحميل المنتجات...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        {/* عنوان الصفحة */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Artisan Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl font-normal text-[var(--color-espresso)]">
              🛍️ إدارة المنتجات
            </h1>
            <p className="text-[var(--text-secondary)]">
              منتجاتك المعروضة على المنصة
            </p>
          </div>

          <Link
            href="/artisan/products/add"
            className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-3 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
          >
            + إضافة منتج جديد
          </Link>
        </div>

        {/* عرض المنتجات */}
        {products.length === 0 ? (
          <div className="mt-16 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              🎉 مفيش منتجات حالياً
            </p>
            <Link
              href="/artisan/products/add"
              className="mt-5 inline-block text-sm font-medium text-[var(--color-copper)]"
            >
              أضف أول منتج لك →
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.slug}
                className="group rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
              >
                {/* صورة المنتج (مؤقتة) */}
                <div
                  className={`h-40 w-full rounded-[var(--radius-md)] ${
                    product.accent === "olive"
                      ? "bg-[var(--color-olive)]"
                      : product.accent === "copper"
                      ? "bg-[var(--color-copper)]"
                      : "bg-[var(--color-terracotta)]"
                  }`}
                />

                <div className="mt-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {product.category}
                  </p>
                  <h3 className="mt-1 font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
                    {product.name}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {product.country}
                  </p>
                  <p className="mt-2 font-medium text-[var(--color-copper)]">
                    ${product.price}
                  </p>
{/* حالة المنتج */}
<div className="mt-2">
  {product.status === "pending" && (
    <span className="inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
      ⏳ قيد المراجعة
    </span>
  )}
  {product.status === "approved" && (
    <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
      ✅ منشور
    </span>
  )}
  {product.status === "rejected" && (
    <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
      ❌ مرفوض
    </span>
  )}
</div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(product.slug)}
                      className="flex-1 rounded-[var(--radius-md)] border border-red-200 px-4 py-2 text-sm text-red-500 transition hover:bg-red-50"
                    >
                      حذف
                    </button>
                    <Link
                      href={`/artisan/products/edit/${product.slug}`}
                      className="flex-1 rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-center text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
                    >
                      تعديل
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
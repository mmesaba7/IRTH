"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  status: "pending" | "approved" | "rejected";
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // التحقق من تسجيل الدخول
    const isAuth = document.cookie.includes("irth-admin-auth=true");
    if (!isAuth) {
      router.push("/dashboard-admin/login");
      return;
    }

    loadProducts();
  }, [router]);

  const loadProducts = () => {
    const allProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );
    setProducts(allProducts);
    setLoading(false);
  };

  const handleReview = (slug: string, action: "approved" | "rejected") => {
    const allProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );
    const updated = allProducts.map((p) =>
      p.slug === slug ? { ...p, status: action } : p
    );
    localStorage.setItem("irth-artisan-products", JSON.stringify(updated));

    // إرسال إشارة تحديث للصفحة الرئيسية
    window.dispatchEvent(new Event("irth-products-updated"));

    loadProducts(); // تحديث القائمة
  };

  // فلترة المنتجات
  const filteredProducts = products.filter((product) => {
    if (filter === "all") return true;
    if (filter === "pending") return product.status === "pending";
    if (filter === "approved") return product.status === "approved";
    if (filter === "rejected") return product.status === "rejected";
    return true;
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-10">
        {/* رأس الصفحة */}
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Admin Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              Products
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage all products ({products.length})
            </p>
          </div>
          <Link
            href="/dashboard-admin/dashboard"
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* أزرار الفلترة */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-2 text-xs font-medium transition ${
              filter === "all"
                ? "bg-[var(--color-espresso)] text-[var(--color-ivory)]"
                : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
            }`}
          >
            All ({products.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`rounded-full px-4 py-2 text-xs font-medium transition ${
              filter === "pending"
                ? "bg-[var(--color-espresso)] text-[var(--color-ivory)]"
                : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
            }`}
          >
            Pending ({products.filter((p) => p.status === "pending").length})
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`rounded-full px-4 py-2 text-xs font-medium transition ${
              filter === "approved"
                ? "bg-[var(--color-espresso)] text-[var(--color-ivory)]"
                : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
            }`}
          >
            Approved ({products.filter((p) => p.status === "approved").length})
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`rounded-full px-4 py-2 text-xs font-medium transition ${
              filter === "rejected"
                ? "bg-[var(--color-espresso)] text-[var(--color-ivory)]"
                : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
            }`}
          >
            Rejected ({products.filter((p) => p.status === "rejected").length})
          </button>
        </div>

        {/* جدول المنتجات */}
        {filteredProducts.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">No products found</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {filter === "all"
                ? "Products will appear here once artisans add them"
                : "No products match this filter"}
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <div className="min-w-full rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
              {/* رأس الجدول */}
              <div className="grid grid-cols-6 gap-4 border-b border-[var(--border-soft)] bg-[var(--surface-muted)] px-6 py-3 text-xs font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                <span>Product</span>
                <span>Artisan</span>
                <span>Category</span>
                <span>Price</span>
                <span>Status</span>
                <span className="text-center">Actions</span>
              </div>

              {/* صفوف الجدول */}
              {filteredProducts.map((product) => (
                <div
                  key={product.slug}
                  className="grid grid-cols-6 gap-4 border-b border-[var(--border-soft)] px-6 py-4 text-sm last:border-0 hover:bg-[var(--surface-muted)]"
                >
                  <span className="font-medium text-[var(--color-espresso)]">
                    {product.name}
                  </span>
                  <span>{product.artisan}</span>
                  <span>{product.category}</span>
                  <span className="text-[var(--color-copper)]">
                    ${product.price.toFixed(2)}
                  </span>
                  <span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        product.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : product.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {product.status === "approved"
                        ? "Approved"
                        : product.status === "rejected"
                        ? "Rejected"
                        : "Pending"}
                    </span>
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {product.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleReview(product.slug, "approved")}
                          className="rounded bg-green-600 px-3 py-1 text-xs text-white transition hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReview(product.slug, "rejected")}
                          className="rounded bg-red-500 px-3 py-1 text-xs text-white transition hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {product.status !== "pending" && (
                      <span className="text-xs text-[var(--text-muted)]">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
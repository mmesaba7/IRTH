"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// تعريف شكل عرض الحرفي
type ArtisanPromotion = {
  id: string;
  artisanName: string;
  type: "percentage" | "fixed";
  value: number;
  productSlugs: string[];
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "rejected" | "active" | "inactive";
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
};

// تعريف شكل المنتج (للعرض)
type Product = {
  slug: string;
  name: string;
  artisan: string;
  price: number;
};

export default function AdminArtisanPromotionsPage() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<ArtisanPromotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedPromo, setSelectedPromo] = useState<ArtisanPromotion | null>(null);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    loadData();
  }, [router]);

  const loadData = () => {
    // ١- جلب العروض
    const storedPromotions: ArtisanPromotion[] = JSON.parse(
      localStorage.getItem("irth-artisan-promotions") || "[]"
    );
    setPromotions(storedPromotions);

    // ٢- جلب المنتجات (للعرض)
    const storedProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );
    // نضيف المنتجات الأساسية كمان
    import("../../data/products").then((module) => {
      const baseProducts = Object.values(module.products);
      const allProducts = [...baseProducts, ...storedProducts];
      setProducts(allProducts);
    });

    setLoading(false);
  };

  const handleReview = (id: string, action: "approved" | "rejected") => {
    const updated: ArtisanPromotion[] = promotions.map((p) => {
  if (p.id !== id) {
    return p;
  }

  return {
    ...p,
    status: action,
    adminNote,
    updatedAt: new Date().toISOString(),
  };
});

    localStorage.setItem("irth-artisan-promotions", JSON.stringify(updated));
    setPromotions(updated);
    setSelectedPromo(null);
    setAdminNote("");
    setMessage(`✅ تم ${action === "approved" ? "اعتماد" : "رفض"} العرض بنجاح`);
    setTimeout(() => setMessage(""), 3000);
  };

  // فلترة العروض المعلقة
  const pendingPromotions = promotions.filter((p) => p.status === "pending");

  // فلترة العروض المعتمدة
  const approvedPromotions = promotions.filter(
    (p) => p.status === "active" || p.status === "approved"
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--text-secondary)]">جاري التحميل...</p>
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
              مراجعة عروض الحرفيين
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {pendingPromotions.length} عروض في انتظار المراجعة
            </p>
          </div>
          <Link
            href="/dashboard-admin/dashboard"
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
          >
            ← Back
          </Link>
        </div>

        {/* رسالة التحديث */}
        {message && (
          <div className="mt-4 rounded-[var(--radius-md)] bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* العروض المعلقة */}
        <div className="mt-8">
          <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
            في انتظار المراجعة
          </h2>
          {pendingPromotions.length === 0 ? (
            <div className="mt-4 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-6 text-center text-[var(--text-secondary)]">
              🎉 مفيش عروض في انتظار المراجعة
            </div>
          ) : (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {pendingPromotions.map((promo) => {
                const promoProducts = products.filter((p) =>
                  promo.productSlugs.includes(p.slug)
                );
                return (
                  <div
                    key={promo.id}
                    className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 transition hover:shadow-[var(--shadow-card)]"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-[var(--color-espresso)]">
                        {promo.artisanName}
                      </p>
                      <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                        قيد المراجعة
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 text-sm">
                      <p>
                        <span className="text-[var(--text-muted)]">النوع:</span>{" "}
                        {promo.type === "percentage" ? "نسبة مئوية" : "مبلغ ثابت"}
                      </p>
                      <p>
                        <span className="text-[var(--text-muted)]">قيمة الخصم:</span>{" "}
                        <span className="font-medium text-[var(--color-copper)]">
                          {promo.type === "percentage"
                            ? `${promo.value}%`
                            : `${promo.value}$`}
                        </span>
                      </p>
                      <p>
                        <span className="text-[var(--text-muted)]">المنتجات:</span>{" "}
                        {promoProducts.map((p) => p.name).join(", ") ||
                          promo.productSlugs.join(", ")}
                      </p>
                      <p>
                        <span className="text-[var(--text-muted)]">المدة:</span>{" "}
                        {new Date(promo.startDate).toLocaleDateString("ar-EG")} →{" "}
                        {new Date(promo.endDate).toLocaleDateString("ar-EG")}
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      <textarea
                        placeholder="ملاحظة (اختياري)"
                        value={selectedPromo?.id === promo.id ? adminNote : ""}
                        onChange={(e) => {
                          setSelectedPromo(promo);
                          setAdminNote(e.target.value);
                        }}
                        className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReview(promo.id, "approved")}
                          className="flex-1 rounded-[var(--radius-md)] bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                        >
                          ✅ موافقة
                        </button>
                        <button
                          onClick={() => handleReview(promo.id, "rejected")}
                          className="flex-1 rounded-[var(--radius-md)] bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
                        >
                          ❌ رفض
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* العروض المعتمدة */}
        <div className="mt-16">
          <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
            العروض المعتمدة
          </h2>
          {approvedPromotions.length === 0 ? (
            <div className="mt-4 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-6 text-center text-[var(--text-secondary)]">
              مفيش عروض معتمدة حتى الآن
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <div className="min-w-full rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
                <div className="grid grid-cols-6 gap-4 border-b border-[var(--border-soft)] bg-[var(--surface-muted)] px-6 py-3 text-xs font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  <span>الحرفي</span>
                  <span>الخصم</span>
                  <span>المنتجات</span>
                  <span>المدة</span>
                  <span>الحالة</span>
                  <span className="text-center">ملاحظة</span>
                </div>

                {approvedPromotions.map((promo) => {
                  const promoProducts = products.filter((p) =>
                    promo.productSlugs.includes(p.slug)
                  );
                  const isActive = new Date(promo.endDate) >= new Date();

                  return (
                    <div
                      key={promo.id}
                      className="grid grid-cols-6 gap-4 border-b border-[var(--border-soft)] px-6 py-4 text-sm last:border-0 hover:bg-[var(--surface-muted)]"
                    >
                      <span className="font-medium text-[var(--color-espresso)]">
                        {promo.artisanName}
                      </span>
                      <span className="text-[var(--color-copper)]">
                        {promo.type === "percentage"
                          ? `${promo.value}%`
                          : `${promo.value}$`}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {promoProducts.map((p) => p.name).join(", ") ||
                          promo.productSlugs.length + " منتج"}
                      </span>
                      <span className="text-xs">
                        {new Date(promo.startDate).toLocaleDateString("ar-EG")}
                        <br />
                        → {new Date(promo.endDate).toLocaleDateString("ar-EG")}
                      </span>
                      <span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {isActive ? "نشط" : "منتهي"}
                        </span>
                      </span>
                      <span className="text-center text-xs text-[var(--text-muted)]">
                        {promo.adminNote || "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

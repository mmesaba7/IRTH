"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { products as baseProducts } from "../../data/products";
import { createClient } from "@/lib/supabase/client";

// تعريف شكل العرض
type ArtisanPromotion = {
  id: string;
  artisanName: string;
  type: "percentage" | "fixed";
  value: number;
  productSlugs: string[]; // المنتجات المعنية بالعرض
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "rejected" | "active" | "inactive";
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
};

// تعريف شكل المنتج
type Product = {
  slug: string;
  name: string;
  artisan: string;
  price: number;
  category: string;
};

export default function ArtisanPromotionsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [promotions, setPromotions] = useState<ArtisanPromotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // بيانات الحرفي (مؤقتة)
  const artisanName = "Ahmed Hassan";

  // نموذج إضافة عرض جديد
  const [newPromotion, setNewPromotion] = useState({
    type: "percentage",
    value: 10,
    productSlugs: [] as string[],
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  });

  useEffect(() => {
    loadData();
  }, [router]);

  const loadData = () => {
    // ١- جلب منتجات الحرفي
    const storedProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );
    const baseProductsList = Object.values(baseProducts);
    const allProducts = [...baseProductsList, ...storedProducts];
    const artisanProducts = allProducts.filter(
      (p) => p.artisan === artisanName
    );
    setProducts(artisanProducts);

    // ٢- جلب العروض
    const storedPromotions: ArtisanPromotion[] = JSON.parse(
      localStorage.getItem("irth-artisan-promotions") || "[]"
    );
    const artisanPromotions = storedPromotions.filter(
      (p) => p.artisanName === artisanName
    );
    setPromotions(artisanPromotions);
    setLoading(false);
  };

  const handleAddPromotion = () => {
    if (newPromotion.productSlugs.length === 0) {
      setMessage("❌ من فضلك اختر منتج واحد على الأقل");
      return;
    }

    if (newPromotion.value <= 0) {
      setMessage("❌ قيمة الخصم يجب أن تكون أكبر من صفر");
      return;
    }

    const promotion: ArtisanPromotion = {
      id: `promo-${Date.now()}`,
      artisanName: artisanName,
      type: newPromotion.type as "percentage" | "fixed",
      value: Number(newPromotion.value),
      productSlugs: newPromotion.productSlugs,
      startDate: newPromotion.startDate,
      endDate: newPromotion.endDate,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const stored = JSON.parse(
      localStorage.getItem("irth-artisan-promotions") || "[]"
    );
    stored.push(promotion);
    localStorage.setItem("irth-artisan-promotions", JSON.stringify(stored));

    setPromotions([...promotions, promotion]);
    setNewPromotion({
      type: "percentage",
      value: 10,
      productSlugs: [],
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    });
    setShowAddForm(false);
    setMessage("✅ تم إرسال العرض للمراجعة");
    setTimeout(() => setMessage(""), 3000);
  };

  const toggleProductSelection = (slug: string) => {
    setNewPromotion((prev) => {
      const selected = prev.productSlugs.includes(slug)
        ? prev.productSlugs.filter((s) => s !== slug)
        : [...prev.productSlugs, slug];
      return { ...prev, productSlugs: selected };
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري التحميل...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        {/* رأس الصفحة */}
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Artisan Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              العروض والخصومات
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              أنشئ عروض على منتجاتك ({promotions.length})
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="rounded-[var(--radius-md)] bg-[var(--color-copper)] px-6 py-2 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-espresso)]"
            >
              {showAddForm ? "إلغاء" : "+ عرض جديد"}
            </button>
            <button
              type="button"
              onClick={async () => {
  await supabase.auth.signOut({ scope: "local" });
  router.replace("/artisan/login");
  router.refresh();
}}
              className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
            >
              Logout
            </button>
          </div>
        </div>

        {/* رسالة التحديث */}
        {message && (
          <div className="mt-4 rounded-[var(--radius-md)] bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* نموذج إضافة عرض جديد */}
        {showAddForm && (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
              عرض جديد
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  نوع الخصم
                </label>
                <select
                  value={newPromotion.type}
                  onChange={(e) =>
                    setNewPromotion({ ...newPromotion, type: e.target.value })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                >
                  <option value="percentage">نسبة مئوية</option>
                  <option value="fixed">مبلغ ثابت</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  قيمة الخصم
                </label>
                <input
                  type="number"
                  value={newPromotion.value}
                  onChange={(e) =>
                    setNewPromotion({
                      ...newPromotion,
                      value: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  تاريخ البداية
                </label>
                <input
                  type="date"
                  value={newPromotion.startDate}
                  onChange={(e) =>
                    setNewPromotion({
                      ...newPromotion,
                      startDate: e.target.value,
                    })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  تاريخ النهاية
                </label>
                <input
                  type="date"
                  value={newPromotion.endDate}
                  onChange={(e) =>
                    setNewPromotion({
                      ...newPromotion,
                      endDate: e.target.value,
                    })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                اختر المنتجات المعنية بالعرض
              </label>
              <div className="flex flex-wrap gap-2">
                {products.map((product) => (
                  <button
                    key={product.slug}
                    onClick={() => toggleProductSelection(product.slug)}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      newPromotion.productSlugs.includes(product.slug)
                        ? "bg-[var(--color-espresso)] text-[var(--color-ivory)]"
                        : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
                    }`}
                  >
                    {product.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAddPromotion}
              className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-2 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
            >
              إرسال للمراجعة
            </button>
          </div>
        )}

        {/* جدول العروض */}
        {promotions.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              🎉 مفيش عروض حالياً
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-2 text-sm text-[var(--color-copper)] hover:underline"
            >
              أضف عرضك الأول
            </button>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <div className="min-w-full rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
              <div className="grid grid-cols-6 gap-4 border-b border-[var(--border-soft)] bg-[var(--surface-muted)] px-6 py-3 text-xs font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                <span>النوع</span>
                <span>قيمة الخصم</span>
                <span>المنتجات</span>
                <span>المدة</span>
                <span>الحالة</span>
                <span className="text-center">ملاحظة</span>
              </div>

              {promotions.map((promo) => {
                const isExpired = new Date(promo.endDate) < new Date();
                const displayStatus =
                  promo.status === "active" && isExpired
                    ? "inactive"
                    : promo.status;

                return (
                  <div
                    key={promo.id}
                    className="grid grid-cols-6 gap-4 border-b border-[var(--border-soft)] px-6 py-4 text-sm last:border-0 hover:bg-[var(--surface-muted)]"
                  >
                    <span className="text-[var(--text-secondary)]">
                      {promo.type === "percentage" ? "نسبة" : "ثابت"}
                    </span>
                    <span className="font-medium text-[var(--color-copper)]">
                      {promo.type === "percentage"
                        ? `${promo.value}%`
                        : `${promo.value}$`}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {promo.productSlugs.length} منتج
                    </span>
                    <span className="text-xs">
                      {new Date(promo.startDate).toLocaleDateString("ar-EG")}
                      <br />
                      → {new Date(promo.endDate).toLocaleDateString("ar-EG")}
                    </span>
                    <span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          displayStatus === "approved" ||
                          displayStatus === "active"
                            ? "bg-green-100 text-green-700"
                            : displayStatus === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : displayStatus === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {displayStatus === "approved" ||
                        displayStatus === "active"
                          ? "معتمد"
                          : displayStatus === "pending"
                          ? "قيد المراجعة"
                          : displayStatus === "rejected"
                          ? "مرفوض"
                          : "غير نشط"}
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
      </section>
    </main>
  );
}


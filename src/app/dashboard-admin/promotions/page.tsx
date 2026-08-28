"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// تعريف شكل الكوبون
type Coupon = {
  id: string;
  code: string;
  type: "percentage" | "fixed"; // نسبة مئوية أو مبلغ ثابت
  value: number; // قيمة الخصم
  minOrder?: number; // الحد الأدنى للطلب
  maxDiscount?: number; // الحد الأقصى للخصم (للنسبة المئوية)
  startDate: string;
  endDate: string;
  usageLimit?: number; // عدد مرات الاستخدام الكلي
  perUserLimit?: number; // عدد مرات الاستخدام لكل عميل
  applicableProducts?: string[]; // slugs المنتجات
  applicableCrafts?: string[]; // أسماء الحرف
  stackable: boolean; // قابل للجمع مع عروض تانية
  fundingSource: "irth" | "artisan"; // جهة التمويل
  artisanName?: string; // اسم الحرفي لو التمويل من عنده
  status: "active" | "inactive" | "expired";
  createdAt: string;
  updatedAt?: string;
};

export default function AdminPromotionsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // نموذج إضافة كوبون جديد
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    type: "percentage",
    value: 10,
    minOrder: "",
    maxDiscount: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    usageLimit: "",
    perUserLimit: "",
    stackable: false,
    fundingSource: "irth",
  });

  useEffect(() => {
    loadCoupons();
  }, [router]);

  const loadCoupons = () => {
    const storedCoupons: Coupon[] = JSON.parse(
      localStorage.getItem("irth-coupons") || "[]"
    );

    if (storedCoupons.length === 0) {
      const defaultCoupons: Coupon[] = [
        {
          id: "coupon-1",
          code: "WELCOME10",
          type: "percentage",
          value: 10,
          minOrder: 100,
          maxDiscount: 50,
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          usageLimit: 100,
          perUserLimit: 1,
          stackable: false,
          fundingSource: "irth",
          status: "active",
          createdAt: new Date().toISOString(),
        },
        {
          id: "coupon-2",
          code: "FREESHIP",
          type: "fixed",
          value: 50,
          minOrder: 200,
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          usageLimit: 50,
          perUserLimit: 1,
          stackable: false,
          fundingSource: "irth",
          status: "active",
          createdAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem("irth-coupons", JSON.stringify(defaultCoupons));
      setCoupons(defaultCoupons);
      setLoading(false);
      return;
    }

    setCoupons(storedCoupons);
    setLoading(false);
  };

  const handleAddCoupon = () => {
    if (!newCoupon.code.trim()) {
      setMessage("❌ من فضلك أدخل كود الخصم");
      return;
    }

    // التحقق من عدم وجود كوبون بنفس الكود
    if (coupons.some((c) => c.code === newCoupon.code.trim())) {
      setMessage("❌ هذا الكود موجود بالفعل");
      return;
    }

    const coupon: Coupon = {
      id: `coupon-${Date.now()}`,
      code: newCoupon.code.trim().toUpperCase(),
      type: newCoupon.type as "percentage" | "fixed",
      value: Number(newCoupon.value),
      minOrder: newCoupon.minOrder ? Number(newCoupon.minOrder) : undefined,
      maxDiscount: newCoupon.maxDiscount ? Number(newCoupon.maxDiscount) : undefined,
      startDate: newCoupon.startDate,
      endDate: newCoupon.endDate,
      usageLimit: newCoupon.usageLimit ? Number(newCoupon.usageLimit) : undefined,
      perUserLimit: newCoupon.perUserLimit
        ? Number(newCoupon.perUserLimit)
        : undefined,
      stackable: newCoupon.stackable,
      fundingSource: newCoupon.fundingSource as "irth" | "artisan",
      status: "active",
      createdAt: new Date().toISOString(),
    };

    const updated = [...coupons, coupon];
    localStorage.setItem("irth-coupons", JSON.stringify(updated));
    setCoupons(updated);
    setNewCoupon({
      code: "",
      type: "percentage",
      value: 10,
      minOrder: "",
      maxDiscount: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      usageLimit: "",
      perUserLimit: "",
      stackable: false,
      fundingSource: "irth",
    });
    setShowAddForm(false);
    setMessage("✅ تم إضافة الكوبون بنجاح");
    setTimeout(() => setMessage(""), 3000);
  };

  const updateCouponStatus = (id: string, status: "active" | "inactive") => {
    const updated = coupons.map((c) =>
      c.id === id
        ? { ...c, status, updatedAt: new Date().toISOString() }
        : c
    );
    localStorage.setItem("irth-coupons", JSON.stringify(updated));
    setCoupons(updated);
  };

  const deleteCoupon = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الكوبون؟")) return;
    const updated = coupons.filter((c) => c.id !== id);
    localStorage.setItem("irth-coupons", JSON.stringify(updated));
    setCoupons(updated);
  };

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
              العروض والكوبونات
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              إدارة العروض والكوبونات ({coupons.length})
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="rounded-[var(--radius-md)] bg-[var(--color-copper)] px-6 py-2 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-espresso)]"
            >
              {showAddForm ? "إلغاء" : "+ إضافة كوبون جديد"}
            </button>
            <Link
              href="/dashboard-admin/dashboard"
              className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
            >
              ← Back
            </Link>
          </div>
        </div>

        {/* رسالة التحديث */}
        {message && (
          <div className="mt-4 rounded-[var(--radius-md)] bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* نموذج إضافة كوبون جديد */}
        {showAddForm && (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
              إضافة كوبون جديد
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  كود الخصم *
                </label>
                <input
                  type="text"
                  value={newCoupon.code}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, code: e.target.value })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  placeholder="مثال: SUMMER20"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  النوع
                </label>
                <select
                  value={newCoupon.type}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, type: e.target.value })
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
                  value={newCoupon.value}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, value: Number(e.target.value) })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  جهة التمويل
                </label>
                <select
                  value={newCoupon.fundingSource}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, fundingSource: e.target.value })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                >
                  <option value="irth">إرث</option>
                  <option value="artisan">حرفي</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  الحد الأدنى للطلب (اختياري)
                </label>
                <input
                  type="number"
                  value={newCoupon.minOrder}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, minOrder: e.target.value })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  الحد الأقصى للخصم (للنسبة المئوية فقط)
                </label>
                <input
                  type="number"
                  value={newCoupon.maxDiscount}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, maxDiscount: e.target.value })
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
                  value={newCoupon.startDate}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, startDate: e.target.value })
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
                  value={newCoupon.endDate}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, endDate: e.target.value })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  عدد مرات الاستخدام الكلي
                </label>
                <input
                  type="number"
                  value={newCoupon.usageLimit}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, usageLimit: e.target.value })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  min="0"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  عدد مرات الاستخدام لكل عميل
                </label>
                <input
                  type="number"
                  value={newCoupon.perUserLimit}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, perUserLimit: e.target.value })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  min="0"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="stackable"
                  checked={newCoupon.stackable}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, stackable: e.target.checked })
                  }
                  className="h-4 w-4 accent-[var(--color-copper)]"
                />
                <label htmlFor="stackable" className="ml-2 text-sm text-[var(--text-secondary)]">
                  قابل للجمع مع عروض تانية
                </label>
              </div>
            </div>
            <button
              onClick={handleAddCoupon}
              className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-2 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
            >
              حفظ الكوبون
            </button>
          </div>
        )}

        {/* جدول الكوبونات */}
        {coupons.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              🎉 مفيش كوبونات
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <div className="min-w-full rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
              {/* رأس الجدول */}
              <div className="grid grid-cols-7 gap-4 border-b border-[var(--border-soft)] bg-[var(--surface-muted)] px-6 py-3 text-xs font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                <span>الكود</span>
                <span>النوع</span>
                <span>القيمة</span>
                <span>الحد الأدنى</span>
                <span>المدة</span>
                <span>الحالة</span>
                <span className="text-center">إجراءات</span>
              </div>

              {/* صفوف الجدول */}
              {coupons.map((coupon) => {
                const isExpired = new Date(coupon.endDate) < new Date();
                const displayStatus =
                  coupon.status === "active" && isExpired
                    ? "expired"
                    : coupon.status;

                return (
                  <div
                    key={coupon.id}
                    className="grid grid-cols-7 gap-4 border-b border-[var(--border-soft)] px-6 py-4 text-sm last:border-0 hover:bg-[var(--surface-muted)]"
                  >
                    <span className="font-mono font-medium text-[var(--color-espresso)]">
                      {coupon.code}
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {coupon.type === "percentage" ? "نسبة" : "ثابت"}
                    </span>
                    <span>
                      {coupon.type === "percentage"
                        ? `${coupon.value}%`
                        : `${coupon.value}$`}
                    </span>
                    <span>
                      {coupon.minOrder ? `${coupon.minOrder}$` : "—"}
                    </span>
                    <span className="text-xs">
                      {new Date(coupon.startDate).toLocaleDateString("ar-EG")}
                      <br />
                      → {new Date(coupon.endDate).toLocaleDateString("ar-EG")}
                    </span>
                    <span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          displayStatus === "active"
                            ? "bg-green-100 text-green-700"
                            : displayStatus === "expired"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {displayStatus === "active"
                          ? "نشط"
                          : displayStatus === "expired"
                          ? "منتهي"
                          : "غير نشط"}
                      </span>
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      {displayStatus !== "expired" && (
                        <button
                          onClick={() =>
                            updateCouponStatus(
                              coupon.id,
                              coupon.status === "active" ? "inactive" : "active"
                            )
                          }
                          className={`rounded px-3 py-1 text-xs text-white transition ${
                            coupon.status === "active"
                              ? "bg-red-500 hover:bg-red-600"
                              : "bg-green-500 hover:bg-green-600"
                          }`}
                        >
                          {coupon.status === "active" ? "إيقاف" : "تفعيل"}
                        </button>
                      )}
                      <button
                        onClick={() => deleteCoupon(coupon.id)}
                        className="rounded bg-red-500 px-3 py-1 text-xs text-white transition hover:bg-red-600"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

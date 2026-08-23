"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";

export default function ArtisanDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // نتحقق من تسجيل الدخول
  useEffect(() => {
    const isAuth = localStorage.getItem("irth-artisan-auth");
    if (!isAuth) {
      router.push("/artisan/login");
    } else {
      setLoading(false);
    }
  }, [router]);

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
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Welcome back
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl font-normal text-[var(--color-espresso)]">
              أحمد حسن
            </h1>
            <p className="text-[var(--text-secondary)]">لوحة تحكم الحرفي</p>
          </div>

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("irth-artisan-auth");
              router.push("/artisan/login");
            }}
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
          >
            تسجيل خروج
          </button>
        </div>

        {/* القسم ١: الكاردات السريعة (Overview) */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <p className="text-sm text-[var(--text-muted)]">الطلبات الجديدة</p>
            <p className="mt-2 text-3xl font-bold text-[var(--color-espresso)]">3</p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <p className="text-sm text-[var(--text-muted)]">قيد التجهيز</p>
            <p className="mt-2 text-3xl font-bold text-[var(--color-espresso)]">5</p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <p className="text-sm text-[var(--text-muted)]">المنتجات المنشورة</p>
            <p className="mt-2 text-3xl font-bold text-[var(--color-espresso)]">12</p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <p className="text-sm text-[var(--text-muted)]">المستحقات</p>
            <p className="mt-2 text-3xl font-bold text-[var(--color-copper)]">$1,240</p>
          </div>
        </div>

        {/* هنا هنضيف باقي الأقسام (المنتجات، الطلبات، العروض، إلخ) في الخطوات الجاية */}
        <div className="mt-16 text-center text-[var(--text-muted)]">
          <p>✅ باقي الأقسام (المنتجات، الطلبات، العروض، المدفوعات، الملف الشخصي، الإشعارات، الإعدادات) هنضيفها في الخطوات القادمة</p>
        </div>
        {/* روابط الأقسام */}
<div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
  <a
    href="/artisan/orders"
    className="group rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
  >
    <div className="text-3xl">📦</div>
    <h3 className="mt-3 font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
      إدارة الطلبات
    </h3>
    <p className="mt-2 text-sm text-[var(--text-secondary)]">
      شوف الطلبات الجديدة وغير حالتها
    </p>
  </a>

  <a
    href="/artisan/products"
    className="group rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
  >
    <div className="text-3xl">🛍️</div>
    <h3 className="mt-3 font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
      إدارة المنتجات
    </h3>
    <p className="mt-2 text-sm text-[var(--text-secondary)]">
      أضف منتجات جديدة أو عدل المنتجات الموجودة
    </p>
  </a>

  <a
    href="/artisan/payouts"
    className="group rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
  >
    <div className="text-3xl">💰</div>
    <h3 className="mt-3 font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
      المستحقات والمدفوعات
    </h3> href="/artisan/payouts"
    <p className="mt-2 text-sm text-[var(--text-secondary)]">
      تابع المبيعات والمستحقات المالية
    </p>
  </a>
</div>
      </section>
    </main>
  );
}
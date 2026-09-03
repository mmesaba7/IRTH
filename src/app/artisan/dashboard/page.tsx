"use client";

import Link from "next/link";
import Header from "../../components/Header";
import IrthIcon, { type IrthIconName } from "../../components/IrthIcon";

type DashboardLink = {
  href: string;
  title: string;
  description: string;
  icon: IrthIconName;
};

const dashboardLinks: DashboardLink[] = [
  {
    href: "/artisan/orders",
    title: "إدارة الطلبات",
    description: "تابع طلبات منتجاتك وحدّث مراحل التجهيز المسموح بها.",
    icon: "orders",
  },
  {
    href: "/artisan/products",
    title: "إدارة المنتجات",
    description: "راجع منتجاتك، أضف منتجًا جديدًا، أو عدّل المنتجات الحالية.",
    icon: "craft",
  },
  {
    href: "/artisan/payouts",
    title: "المستحقات والمدفوعات",
    description: "تابع المستحقات وحالة عمليات الصرف من الواجهة المالية المخصصة.",
    icon: "journal",
  },
  {
    href: "/artisan/reviews",
    title: "التقييمات والردود",
    description: "راجع تقييمات مشترياتك الحقيقية وأرسل ردودك لمراجعة IRTH.",
    icon: "story",
  },
  {
    href: "/artisan/promotions",
    title: "العروض والخصومات",
    description: "اقترح عروضًا على منتجاتك وتابع حالة مراجعة IRTH قبل النشر.",
    icon: "spark",
  },
];

export default function ArtisanDashboardPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        <div className="flex flex-col gap-6 border-b border-[var(--border-soft)] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Artisan Panel
            </p>
            <h1 className="mt-2 font-[var(--font-display)] text-4xl font-normal text-[var(--color-espresso)] md:text-5xl">
              لوحة تحكم الحرفي
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              إدارة الطلبات والمنتجات والمستحقات والتقييمات والعروض من مكان واحد، بدون عرض بيانات تواصل العميل الحساسة.
            </p>
          </div>

          <Link
            href="/artisan/products/new"
            className="inline-flex w-fit items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-copper)] px-6 py-3 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-espresso)]"
          >
            <IrthIcon name="craft" className="h-5 w-5" />
            إضافة منتج جديد
          </Link>
        </div>

        <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5 text-sm leading-6 text-[var(--text-secondary)]">
          الأرقام التشغيلية والمالية لا تُعرض هنا إلا من مصدر موثوق. استخدم الأقسام المتخصصة أدناه لمتابعة الحالة الفعلية لكل جزء من عملك.
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 transition hover:-translate-y-1 hover:border-[var(--color-copper)] hover:shadow-[var(--shadow-card)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--color-copper)] transition group-hover:bg-[var(--color-copper)] group-hover:text-[var(--color-ivory)]">
                <IrthIcon name={item.icon} className="h-5 w-5" />
              </div>
              <h2 className="mt-5 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {item.description}
              </p>
              <p className="mt-5 text-sm font-medium text-[var(--color-copper)]">
                فتح القسم ←
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

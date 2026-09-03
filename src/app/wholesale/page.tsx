import Link from "next/link";
import Header from "../components/Header";
import MobileBottomNav from "../components/MobileBottomNav";
import WholesaleRequestForm from "../components/WholesaleRequestForm";

export default function WholesalePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      <section className="relative overflow-hidden bg-[var(--color-espresso)] text-[var(--color-ivory)]">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full border border-[var(--color-copper)]/20" />
        <div className="absolute bottom-8 left-8 h-24 w-24 rotate-45 border border-[var(--color-copper)]/15" />
        <div className="relative mx-auto max-w-[var(--container-max)] px-6 py-14 md:py-20">
          <Link href="/" className="text-sm text-[var(--color-ivory)]/65 transition hover:text-[var(--color-copper)]">
            ← Home
          </Link>
          <p className="mt-8 text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-copper)]">
            Wholesale / Bulk Order
          </p>
          <h1 className="mt-3 max-w-3xl font-[var(--font-display)] text-5xl leading-tight md:text-7xl">
            طلب جملة
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-[var(--color-ivory)]/75 md:text-base">
            لو محتاج كمية كبيرة من منتج أو حرفة، ابعت التفاصيل إلى IRTH. فريق IRTH هو اللي يدير التنسيق؛ بيانات تواصلك لا تُرسل للحرفي مباشرة.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-10 md:px-6 md:py-14">
        <div className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-8 md:p-10">
          <div className="mb-8 border-b border-[var(--border-soft)] pb-6">
            <p className="section-eyebrow">Request details</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Share the quantity and requirements with IRTH so the request can be reviewed and coordinated through the marketplace.
            </p>
          </div>
          <WholesaleRequestForm sourceType="general" />
        </div>
      </section>

      <MobileBottomNav />
    </main>
  );
}

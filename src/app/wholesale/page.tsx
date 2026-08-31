import Link from "next/link";
import Header from "../components/Header";
import WholesaleRequestForm from "../components/WholesaleRequestForm";

export default function WholesalePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-12 md:py-20">
        <Link href="/" className="text-sm text-[var(--color-copper)] hover:underline">← Home</Link>
        <p className="mt-8 text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Wholesale / Bulk Order</p>
        <h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">طلب جملة</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
          لو محتاج كمية كبيرة من منتج أو حرفة، ابعت التفاصيل إلى IRTH. فريق IRTH هو اللي يدير التنسيق؛ بيانات تواصلك لا تُرسل للحرفي مباشرة.
        </p>
        <div className="mt-8">
          <WholesaleRequestForm sourceType="general" />
        </div>
      </section>
    </main>
  );
}

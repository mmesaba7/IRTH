"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "../../../components/Header";
import MobileBottomNav from "../../../components/MobileBottomNav";
import ReturnRequestPanel from "../../../components/ReturnRequestPanel";

export default function CustomerReturnOrderPage() {
  const params = useParams();
  const orderId = String(params.orderId ?? "");

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-4xl px-5 py-10 md:px-6 md:py-16">
        <Link href="/account/orders" className="text-sm font-medium text-[var(--color-copper)] hover:underline">
          ← Back to my orders
        </Link>

        <div className="mt-7 border-b border-[var(--border-soft)] pb-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Returns</p>
          <h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">
            Return request
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Review your eligible delivered items, submit a return request, and follow its status here.
          </p>
        </div>

        <div className="mt-7">
          <ReturnRequestPanel orderId={orderId} />
        </div>
      </section>

      <MobileBottomNav active="account" />
    </main>
  );
}

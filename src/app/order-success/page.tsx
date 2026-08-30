"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "../components/Header";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");
  const status = searchParams.get("status") ?? "received";
  const paymentStatus = searchParams.get("payment") ?? "pending";

  if (!orderNumber) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
        <Header />
        <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
          <div className="rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <h1 className="font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Order reference missing</h1>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">We could not display an order reference from this page.</p>
            <Link href="/" className="mt-6 inline-block text-sm font-medium text-[var(--color-copper)]">Continue shopping →</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-8 text-center md:p-12">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-olive)]">Order received</p>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl font-normal text-[var(--color-espresso)] md:text-5xl">Thank you for your order</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">IRTH received your order securely. Payment has not been collected yet; the payment status remains pending until the Payment Layer is integrated.</p>

          <div className="mt-8 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Order number</p>
            <p className="mt-2 break-all font-mono text-lg font-semibold text-[var(--color-espresso)]">{orderNumber}</p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[var(--radius-md)] border border-[var(--border-soft)] p-5 text-left">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Order status</p>
              <p className="mt-2 font-medium capitalize text-[var(--color-olive)]">{status.replaceAll("_", " ")}</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--border-soft)] p-5 text-left">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Payment status</p>
              <p className="mt-2 font-medium capitalize text-[var(--color-copper)]">{paymentStatus.replaceAll("_", " ")}</p>
            </div>
          </div>

          <p className="mt-6 text-xs leading-5 text-[var(--text-muted)]">This page intentionally does not expose delivery address, phone, email, or other private customer data.</p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-7 py-3 text-sm font-medium text-[var(--color-espresso)] transition hover:border-[var(--color-copper)]">Continue shopping</Link>
            <Link href="/account/orders" className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-7 py-3 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]">View my orders</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[var(--background)]"><Header /></main>}>
      <OrderSuccessContent />
    </Suspense>
  );
}

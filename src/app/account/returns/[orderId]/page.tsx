"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "../../../components/Header";
import ReturnRequestPanel from "../../../components/ReturnRequestPanel";

export default function CustomerReturnOrderPage() {
  const params = useParams();
  const orderId = String(params.orderId ?? "");

  return (
    <main className="min-h-screen bg-[var(--background)] pb-20 text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-4xl px-5 py-10 md:px-6 md:py-16">
        <Link href="/account/orders" className="text-sm font-medium text-[var(--color-copper)] hover:underline">← Back to my orders</Link>
        <div className="mt-7">
          <ReturnRequestPanel orderId={orderId} />
        </div>
      </section>
    </main>
  );
}

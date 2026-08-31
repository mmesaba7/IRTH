import type { Metadata } from "next";
import Header from "@/app/components/Header";
import GuestTrackingClient from "./GuestTrackingClient";

export const metadata: Metadata = {
  title: "Track your order | IRTH",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function GuestTrackingPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
          Secure guest tracking
        </p>
        <h1 className="mt-3 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">
          Follow your order
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          This private link is the key to your guest order tracking. Do not share it publicly.
        </p>

        <div className="mt-8">
          <GuestTrackingClient orderNumber={orderNumber} />
        </div>
      </section>
    </main>
  );
}

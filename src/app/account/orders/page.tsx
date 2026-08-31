import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/app/components/Header";
import OrderTrackingCard from "@/app/components/OrderTrackingCard";
import { createClient } from "@/lib/supabase/server";
import type { CustomerOrderTracking } from "@/lib/customerOrderTracking";

export default async function CustomerOrdersPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/account/login");
  }

  const { data, error } = await supabase.rpc("get_my_customer_orders");

  if (error) {
    console.error("Customer orders read failed:", error.message);
  }

  const orders = !error && Array.isArray(data)
    ? (data as CustomerOrderTracking[])
    : [];

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] pb-24">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              My Account
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">
              My Orders
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {error ? "Unable to load orders right now" : `${orders.length} ${orders.length === 1 ? "order" : "orders"} placed`}
            </p>
          </div>

          <Link
            href="/account"
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
          >
            ← Back to Account
          </Link>
        </div>

        {error ? (
          <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              We could not load your orders securely. Please try again.
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-16 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">No orders yet</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Start shopping and your real orders will appear here.
            </p>
            <Link
              href="/crafts"
              className="mt-5 inline-block text-sm font-medium text-[var(--color-copper)] hover:underline"
            >
              Explore crafts →
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {orders.map((order, index) => (
              <OrderTrackingCard
                key={order.orderNumber}
                order={order}
                defaultOpen={index === 0}
              />
            ))}
          </div>
        )}
      </section>

      <nav className="bottom-nav md:hidden">
        <Link href="/">
          <span>🏠</span> Home
        </Link>
        <Link href="/search">
          <span>🔎</span> Search
        </Link>
        <Link href="/crafts">
          <span>🧭</span> Explore
        </Link>
        <Link href="/saved">
          <span>❤️</span> Saved
        </Link>
        <Link href="/account" className="active">
          <span>👤</span> Account
        </Link>
      </nav>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import IrthIcon, { type IrthIconName } from "../../components/IrthIcon";
import { createClient } from "@/lib/supabase/client";

type DashboardData = {
  counts: {
    orders: number;
    artisans: number;
    products: number;
    openReturns: number;
    openWholesale: number;
  };
  commissionByCurrency: Array<{ currencyCode: string; amount: string | number }>;
  recentOrders: Array<{
    orderId: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    currencyCode: string;
    finalTotal: string | number;
    createdAt: string;
    itemCount: number;
  }>;
};

type AdminNavItem = {
  title: string;
  description: string;
  href: string;
  icon: IrthIconName;
};

const EMPTY: DashboardData = {
  counts: { orders: 0, artisans: 0, products: 0, openReturns: 0, openWholesale: 0 },
  commissionByCurrency: [],
  recentOrders: [],
};

export default function DashboardAdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/dashboard", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || "Unable to load dashboard.");
        setData(body as DashboardData);
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[var(--background)] text-[var(--text-secondary)]">Loading trusted dashboard…</div>;
  }

  const nav: AdminNavItem[] = [
    { title: "Orders", description: "Manage all orders", href: "/dashboard-admin/orders", icon: "orders" },
    { title: "Returns", description: `${data.counts.openReturns} open`, href: "/dashboard-admin/returns", icon: "return" },
    { title: "Customers", description: "Accounts, suspension & support notes", href: "/dashboard-admin/customers", icon: "user" },
    { title: "Customization Requests", description: "Order customization snapshots", href: "/dashboard-admin/customizations", icon: "craft" },
    { title: "Artisans", description: "Manage artisans", href: "/dashboard-admin/artisans", icon: "user" },
    { title: "Products", description: "Manage products", href: "/dashboard-admin/products", icon: "grid" },
    { title: "Product Management", description: "Remove any product with an audited reason", href: "/dashboard-admin/product-management", icon: "shield" },
    { title: "Price Reviews", description: "Review artisan market price changes", href: "/dashboard-admin/product-price-reviews", icon: "journal" },
    { title: "Commission", description: "Craft defaults & overrides", href: "/dashboard-admin/commission", icon: "craft" },
    { title: "Payouts", description: "Payout operations", href: "/dashboard-admin/payouts", icon: "journal" },
    { title: "Reviews", description: "Moderate reviews & replies", href: "/dashboard-admin/reviews", icon: "story" },
    { title: "Wholesale", description: `${data.counts.openWholesale} open`, href: "/dashboard-admin/wholesale", icon: "orders" },
    { title: "Crafts", description: "Manage crafts", href: "/dashboard-admin/crafts", icon: "craft" },
    { title: "Countries", description: "Manage countries", href: "/dashboard-admin/countries", icon: "globe" },
    { title: "Content Manager", description: "Homepage, Blog, Help, Contact, Footer, Campaigns & Preview", href: "/dashboard-admin/content", icon: "journal" },
    { title: "Promotions", description: "Manage promotions", href: "/dashboard-admin/promotions", icon: "spark" },
    { title: "Artisan Promotions", description: "Review artisan offers", href: "/dashboard-admin/artisan-promotions", icon: "spark" },
    { title: "Settings", description: "Shipping & return settings", href: "/dashboard-admin/settings", icon: "shield" },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-10">
        <div className="flex flex-col gap-5 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Admin Panel</p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Dashboard</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Live trusted marketplace state — no local prototype data.</p>
          </div>
          <button type="button" onClick={async () => { await supabase.auth.signOut({ scope: "local" }); router.replace("/dashboard-admin/login"); router.refresh(); }} className="w-fit rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-muted)]">Logout</button>
        </div>

        {error && <div className="mt-6 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Orders" value={data.counts.orders} />
          <Stat label="Active artisans" value={data.counts.artisans} />
          <Stat label="Published products" value={data.counts.products} />
          <Stat label="Open returns" value={data.counts.openReturns} />
          <Stat label="Open wholesale" value={data.counts.openWholesale} />
        </div>

        <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
          <p className="text-sm text-[var(--text-muted)]">IRTH commission recorded in the settlement ledger</p>
          {data.commissionByCurrency.length === 0 ? <p className="mt-2 text-2xl font-semibold text-[var(--color-copper)]">No commission entries yet</p> : (
            <div className="mt-3 flex flex-wrap gap-4">
              {data.commissionByCurrency.map((row) => <p key={row.currencyCode} className="text-2xl font-semibold text-[var(--color-copper)]">{row.currencyCode} {row.amount}</p>)}
            </div>
          )}
        </div>

        <section className="mt-10">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-copper)]">Operations</p>
            <h2 className="mt-1 font-[var(--font-display)] text-3xl text-[var(--color-espresso)]">Manage IRTH</h2>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="group rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 transition hover:-translate-y-1 hover:border-[var(--color-copper)] hover:shadow-[var(--shadow-card)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--color-copper)] transition group-hover:bg-[var(--color-copper)] group-hover:text-[var(--color-ivory)]">
                  <IrthIcon name={item.icon} className="h-5 w-5" />
                </div>
                <p className="mt-4 font-[var(--font-display)] text-xl text-[var(--color-espresso)]">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{item.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Recent Orders</h2>
            <Link href="/dashboard-admin/orders" className="text-sm font-medium text-[var(--color-copper)] hover:underline">View all →</Link>
          </div>
          <div className="mt-4 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
            {data.recentOrders.length === 0 ? <p className="px-6 py-8 text-center text-sm text-[var(--text-secondary)]">No orders yet.</p> : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]"><tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Items</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Order status</th><th className="px-5 py-3">Payment</th></tr></thead>
                <tbody>{data.recentOrders.map((order) => <tr key={order.orderId} className="border-t border-[var(--border-soft)]"><td className="px-5 py-3"><p className="font-mono text-xs text-[var(--color-espresso)]">{order.orderNumber}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{new Date(order.createdAt).toLocaleString("en-GB")}</p></td><td className="px-5 py-3">{order.itemCount}</td><td className="px-5 py-3">{order.currencyCode} {order.finalTotal}</td><td className="px-5 py-3 capitalize">{order.status.replaceAll("_", " ")}</td><td className="px-5 py-3 capitalize">{order.paymentStatus.replaceAll("_", " ")}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6"><p className="text-sm text-[var(--text-muted)]">{label}</p><p className="mt-2 text-3xl font-bold text-[var(--color-espresso)]">{value}</p></div>;
}

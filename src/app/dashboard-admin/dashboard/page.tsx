"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
type Order = {
  id: string;
  customer: { name: string };
  items: any[];
  total: number;
  status: string;
  createdAt: string;
};

export default function DashboardAdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    orders: 0,
    artisans: 0,
    products: 0,
    commission: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
   
    const orders: Order[] = JSON.parse(
      localStorage.getItem("irth-orders") || "[]"
    );
    const artisans: any[] = JSON.parse(
      localStorage.getItem("irth-artisans") || "[]"
    );
    const products: any[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );

    setStats({
      orders: orders.length,
      artisans: artisans.length,
      products: products.length,
      commission: orders.reduce((sum, order) => sum + order.total * 0.15, 0),
    });

    const sortedOrders = [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setRecentOrders(sortedOrders.slice(0, 5));
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-10">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Admin Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              Dashboard
            </h1>
          </div>
          <button
            type="button"
            onClick={async () => {
  await supabase.auth.signOut({ scope: "local" });
  router.replace("/dashboard-admin/login");
  router.refresh();
}}
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
          >
            Logout
          </button>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <p className="text-sm text-[var(--text-muted)]">الطلبات</p>
            <p className="mt-2 text-3xl font-bold text-[var(--color-espresso)]">
              {stats.orders}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <p className="text-sm text-[var(--text-muted)]">الحرفيين</p>
            <p className="mt-2 text-3xl font-bold text-[var(--color-espresso)]">
              {stats.artisans}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <p className="text-sm text-[var(--text-muted)]">المنتجات</p>
            <p className="mt-2 text-3xl font-bold text-[var(--color-espresso)]">
              {stats.products}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <p className="text-sm text-[var(--text-muted)]">إجمالي العمولات</p>
            <p className="mt-2 text-3xl font-bold text-[var(--color-copper)]">
              ${stats.commission.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
  <Link
    href="/dashboard-admin/orders"
    className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 text-center transition hover:shadow-[var(--shadow-card)] hover:-translate-y-1"
  >
    <p className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
      📦 Orders
    </p>
    <p className="text-sm text-[var(--text-secondary)]">
      Manage all orders
    </p>
  </Link>
  <Link
    href="/dashboard-admin/artisans"
    className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 text-center transition hover:shadow-[var(--shadow-card)] hover:-translate-y-1"
  >
    <p className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
      👤 Artisans
    </p>
    <p className="text-sm text-[var(--text-secondary)]">
      Manage artisans
    </p>
  </Link>
  <Link
    href="/dashboard-admin/products"
    className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 text-center transition hover:shadow-[var(--shadow-card)] hover:-translate-y-1"
  >
    <p className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
      🛍️ Products
    </p>
    <p className="text-sm text-[var(--text-secondary)]">
      Manage products
    </p>
  </Link>
  <Link
    href="/dashboard-admin/commission"
    className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 text-center transition hover:shadow-[var(--shadow-card)] hover:-translate-y-1"
  >
    <p className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
      💰 Commission
    </p>
    <p className="text-sm text-[var(--text-secondary)]">
      Manage commissions
    </p>
  </Link>
  <Link
    href="/dashboard-admin/settings"
    className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 text-center transition hover:shadow-[var(--shadow-card)] hover:-translate-y-1"
  >
    <p className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
      ⚙️ Settings
    </p>
    <p className="text-sm text-[var(--text-secondary)]">
      General settings
    </p>
  </Link>
</div>

        <div className="mt-16">
          <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
            Recent Orders
          </h2>
          <div className="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
            <div className="grid grid-cols-4 gap-4 border-b border-[var(--border-soft)] bg-[var(--surface-muted)] px-6 py-3 text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">
              <span>Order ID</span>
              <span>Customer</span>
              <span>Total</span>
              <span>Status</span>
            </div>
            {recentOrders.length === 0 ? (
              <p className="px-6 py-6 text-center text-[var(--text-secondary)]">
                No orders yet
              </p>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="grid grid-cols-4 gap-4 border-b border-[var(--border-soft)] px-6 py-3 text-sm last:border-0"
                >
                  <span className="font-mono text-xs">{order.id}</span>
                  <span>{order.customer.name}</span>
                  <span>${order.total.toFixed(2)}</span>
                  <span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        order.status === "تم التسليم"
                          ? "bg-green-100 text-green-700"
                          : order.status === "قيد التجهيز"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </span>
                </div>
              ))
            )}
            <Link
  href="/dashboard-admin/reviews"
  className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 text-center transition hover:shadow-[var(--shadow-card)] hover:-translate-y-1"
>
  <p className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
    📝 Reviews
  </p>
  <p className="text-sm text-[var(--text-secondary)]">
    Review artisan replies
  </p>
</Link>
<Link
  href="/dashboard-admin/crafts"
  className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 text-center transition hover:shadow-[var(--shadow-card)] hover:-translate-y-1"
>
  <p className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
    🏺 Crafts
  </p>
  <p className="text-sm text-[var(--text-secondary)]">
    Manage crafts
  </p>
</Link>
<Link
  href="/dashboard-admin/countries"
  className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 text-center transition hover:shadow-[var(--shadow-card)] hover:-translate-y-1"
>
  <p className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
    Countries
  </p>
  <p className="text-sm text-[var(--text-secondary)]">
    Manage countries
  </p>
</Link>
<Link
  href="/dashboard-admin/promotions"
  className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 text-center transition hover:shadow-[var(--shadow-card)] hover:-translate-y-1"
>
  <p className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
    Promotions
  </p>
  <p className="text-sm text-[var(--text-secondary)]">
    Manage coupons & promotions
  </p>
</Link>
<Link
  href="/dashboard-admin/artisan-promotions"
  className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 text-center transition hover:shadow-[var(--shadow-card)] hover:-translate-y-1"
>
  <p className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
    Artisan Promotions
  </p>
  <p className="text-sm text-[var(--text-secondary)]">
    Review artisan promotions
  </p>
</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// تعريف شكل الطلب
type Order = {
  id: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    notes: string;
  };
  paymentMethod: string;
  items: {
    slug: string;
    artisan: string;
    name: string;
    price: number;
  }[];
  total: number;
  status: string;
  createdAt: string;
};

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
const router = useRouter();
const supabase = createClient();

  useEffect(() => {
    // جلب الطلبات من localStorage
    const allOrders: Order[] = JSON.parse(
      localStorage.getItem("irth-orders") || "[]"
    );

    // ترتيب من الأحدث للأقدم
    const sortedOrders = allOrders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setOrders(sortedOrders);
    setLoading(false);
  }, []);

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  if (loading) {
    return (
      
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري التحميل...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] pb-24">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        {/* رأس الصفحة */}
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              My Account
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl md:text-5xl text-[var(--color-espresso)]">
              My Orders
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {orders.length} orders placed
            </p>
          </div>
          <div className="flex items-center gap-3">
  <Link
    href="/account"
    className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
  >
    ← Back to Account
  </Link>

  <button
    type="button"
    onClick={async () => {
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/account/login");
      router.refresh();
    }}
    className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-2 text-sm font-medium text-[var(--color-espresso)] transition hover:border-[var(--color-copper)] hover:text-[var(--color-copper)]"
  >
    Logout
  </button>
</div>
        </div>

        {/* عرض الطلبات */}
        {orders.length === 0 ? (
          <div className="mt-16 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              📦 No orders yet
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Start shopping and your orders will appear here
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
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] overflow-hidden transition hover:shadow-[var(--shadow-card)]"
              >
                {/* رأس الطلب (قابل للنقر) */}
                <button
                  onClick={() => toggleOrderDetails(order.id)}
                  className="w-full px-6 py-4 text-left hover:bg-[var(--surface-muted)] transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-[var(--color-espresso)]">
                        {order.id}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {new Date(order.createdAt).toLocaleDateString("ar-EG")} ·{" "}
                        {order.items.length} products
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          order.status === "تم التسليم"
                            ? "bg-green-100 text-green-700"
                            : order.status === "قيد التجهيز"
                            ? "bg-blue-100 text-blue-700"
                            : order.status === "جاهز للشحن"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {order.status}
                      </span>
                      <span className="font-medium text-[var(--color-copper)]">
                        ${order.total.toFixed(2)}
                      </span>
                      <span className="text-sm text-[var(--text-muted)]">
                        {expandedOrder === order.id ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>
                </button>

                {/* تفاصيل الطلب (موسعة) */}
                {expandedOrder === order.id && (
                  <div className="border-t border-[var(--border-soft)] px-6 py-5 bg-[var(--surface-muted)]/30">
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* معلومات العميل */}
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                          Shipping Details
                        </p>
                        <div className="mt-3 space-y-2 text-sm">
                          <p>
                            <span className="text-[var(--text-muted)]">Name:</span>{" "}
                            {order.customer.name}
                          </p>
                          <p>
                            <span className="text-[var(--text-muted)]">Phone:</span>{" "}
                            {order.customer.phone}
                          </p>
                          <p>
                            <span className="text-[var(--text-muted)]">Address:</span>{" "}
                            {order.customer.address}
                          </p>
                          {order.customer.notes && (
                            <p>
                              <span className="text-[var(--text-muted)]">Notes:</span>{" "}
                              {order.customer.notes}
                            </p>
                          )}
                          <p>
                            <span className="text-[var(--text-muted)]">Payment:</span>{" "}
                            {order.paymentMethod}
                          </p>
                        </div>
                      </div>

                      {/* المنتجات */}
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                          Products
                        </p>
                        <div className="mt-3 space-y-2">
                          {order.items.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm border-b border-[var(--border-soft)] pb-2 last:border-0"
                            >
                              <div>
                                <p className="font-medium text-[var(--color-espresso)]">
                                  {item.name}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                  {item.artisan}
                                </p>
                              </div>
                              <span className="text-[var(--color-copper)]">
                                ${item.price.toFixed(2)}
                              </span>
                            </div>
                          ))}
                          {/* الإجمالي */}
                          <div className="flex items-center justify-between pt-2 font-medium">
                            <span>Total</span>
                            <span className="text-[var(--color-copper)]">
                              ${order.total.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom Navigation */}
      <nav className="bottom-nav md:hidden">
        <Link href="/" className="active">
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
        <Link href="/account">
          <span>👤</span> Account
        </Link>
      </nav>
    </main>
  );
}
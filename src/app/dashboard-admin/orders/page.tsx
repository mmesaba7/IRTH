"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // التحقق من تسجيل الدخول
    const isAuth = document.cookie.includes("irth-admin-auth=true");
    if (!isAuth) {
      router.push("/dashboard-admin/login");
      return;
    }

    // جلب الطلبات من localStorage
    const allOrders: Order[] = JSON.parse(
      localStorage.getItem("irth-orders") || "[]"
    );

    // ترتيب الطلبات من الأحدث للأقدم
    const sortedOrders = allOrders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setOrders(sortedOrders);
    setLoading(false);
  }, [router]);

  // دالة تغيير حالة الطلب
  const updateOrderStatus = (orderId: string, newStatus: string) => {
    const allOrders: Order[] = JSON.parse(
      localStorage.getItem("irth-orders") || "[]"
    );

    const updatedOrders = allOrders.map((order) => {
      if (order.id === orderId) {
        return { ...order, status: newStatus };
      }
      return order;
    });

    localStorage.setItem("irth-orders", JSON.stringify(updatedOrders));

    // تحديث الطلبات في الصفحة
    const sortedUpdated = updatedOrders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setOrders(sortedUpdated);
  };

  // فلترة الطلبات
  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    if (filter === "new") return order.status === "تم استلام الطلب";
    if (filter === "processing") return order.status === "قيد التجهيز";
    if (filter === "completed") return order.status === "تم التسليم";
    return true;
  });

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
        {/* رأس الصفحة */}
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Admin Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              📦 Orders
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage all orders ({orders.length})
            </p>
          </div>
          <Link
            href="/dashboard-admin/dashboard"
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* أزرار الفلترة */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-2 text-xs font-medium transition ${
              filter === "all"
                ? "bg-[var(--color-espresso)] text-[var(--color-ivory)]"
                : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
            }`}
          >
            All ({orders.length})
          </button>
          <button
            onClick={() => setFilter("new")}
            className={`rounded-full px-4 py-2 text-xs font-medium transition ${
              filter === "new"
                ? "bg-[var(--color-espresso)] text-[var(--color-ivory)]"
                : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
            }`}
          >
            New ({orders.filter((o) => o.status === "تم استلام الطلب").length})
          </button>
          <button
            onClick={() => setFilter("processing")}
            className={`rounded-full px-4 py-2 text-xs font-medium transition ${
              filter === "processing"
                ? "bg-[var(--color-espresso)] text-[var(--color-ivory)]"
                : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
            }`}
          >
            Processing ({orders.filter((o) => o.status === "قيد التجهيز").length})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`rounded-full px-4 py-2 text-xs font-medium transition ${
              filter === "completed"
                ? "bg-[var(--color-espresso)] text-[var(--color-ivory)]"
                : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
            }`}
          >
            Completed ({orders.filter((o) => o.status === "تم التسليم").length})
          </button>
        </div>

        {/* جدول الطلبات */}
        {filteredOrders.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">No orders found</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {filter === "all"
                ? "Orders will appear here once customers make purchases"
                : "No orders match this filter"}
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <div className="min-w-full rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
              {/* رأس الجدول */}
              <div className="grid grid-cols-6 gap-4 border-b border-[var(--border-soft)] bg-[var(--surface-muted)] px-6 py-3 text-xs font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                <span>Order ID</span>
                <span>Customer</span>
                <span>Artisan</span>
                <span>Total</span>
                <span>Status</span>
                <span className="text-center">Actions</span>
              </div>

              {/* صفوف الجدول */}
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="grid grid-cols-6 gap-4 border-b border-[var(--border-soft)] px-6 py-4 text-sm last:border-0 hover:bg-[var(--surface-muted)]"
                >
                  <span className="font-mono text-xs">{order.id.slice(0, 12)}</span>
                  <span>{order.customer.name}</span>
                  <span>
                    {order.items.length > 0
                      ? order.items.map((item) => item.artisan).join(", ")
                      : "N/A"}
                  </span>
                  <span className="font-medium text-[var(--color-copper)]">
                    ${order.total.toFixed(2)}
                  </span>
                  <span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
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
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {order.status === "تم استلام الطلب" && (
                      <button
                        onClick={() =>
                          updateOrderStatus(order.id, "قيد التجهيز")
                        }
                        className="rounded bg-blue-500 px-3 py-1 text-xs text-white transition hover:bg-blue-600"
                      >
                        Process
                      </button>
                    )}
                    {order.status === "قيد التجهيز" && (
                      <button
                        onClick={() =>
                          updateOrderStatus(order.id, "جاهز للشحن")
                        }
                        className="rounded bg-purple-500 px-3 py-1 text-xs text-white transition hover:bg-purple-600"
                      >
                        Ready
                      </button>
                    )}
                    {order.status === "جاهز للشحن" && (
                      <button
                        onClick={() =>
                          updateOrderStatus(order.id, "تم التسليم")
                        }
                        className="rounded bg-green-500 px-3 py-1 text-xs text-white transition hover:bg-green-600"
                      >
                        Deliver
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
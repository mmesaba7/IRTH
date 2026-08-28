"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// تعريف أنواع البيانات
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

type CommissionSummary = {
  artisan: string;
  totalSales: number;
  commission: number;
  netAmount: number;
  orderCount: number;
};

export default function AdminCommissionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [commissionRate, setCommissionRate] = useState(15);
  const [summary, setSummary] = useState<CommissionSummary[]>([]);
  const [totalCommission, setTotalCommission] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {

    // تحميل الإعدادات
    const savedSettings = localStorage.getItem("irth-admin-settings");
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setCommissionRate(settings.commissionRate || 15);
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    }

    // تحميل الطلبات
    const allOrders: Order[] = JSON.parse(
      localStorage.getItem("irth-orders") || "[]"
    );
    setOrders(allOrders);

    // حساب العمولات
    calculateCommissions(allOrders);
    setLoading(false);
  }, [router]);

  const calculateCommissions = (ordersList: Order[]) => {
    // تجميع المبيعات حسب الحرفي
    const artisanMap = new Map<string, { sales: number; orders: Set<string> }>();

    ordersList.forEach((order) => {
      if (order.status === "تم التسليم") {
        order.items.forEach((item) => {
          const existing = artisanMap.get(item.artisan);
          if (existing) {
            existing.sales += item.price;
            existing.orders.add(order.id);
          } else {
            artisanMap.set(item.artisan, {
              sales: item.price,
              orders: new Set([order.id]),
            });
          }
        });
      }
    });

    // تحويل الخريطة إلى مصفوفة ملخصة
    const summaryArray: CommissionSummary[] = [];
    let totalComm = 0;

    artisanMap.forEach((value, artisan) => {
      const commission = (value.sales * commissionRate) / 100;
      const netAmount = value.sales - commission;
      summaryArray.push({
        artisan,
        totalSales: value.sales,
        commission,
        netAmount,
        orderCount: value.orders.size,
      });
      totalComm += commission;
    });

    setSummary(summaryArray);
    setTotalCommission(totalComm);
  };

  const handleSaveCommission = () => {
    const settings = JSON.parse(
      localStorage.getItem("irth-admin-settings") || "{}"
    );
    settings.commissionRate = commissionRate;
    localStorage.setItem("irth-admin-settings", JSON.stringify(settings));
    setMessage("✅ Commission rate saved successfully");
    setTimeout(() => setMessage(""), 3000);

    // إعادة حساب العمولات
    calculateCommissions(orders);
  };

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
              💰 Commissions
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage commissions and payouts
            </p>
          </div>
          <Link
            href="/dashboard-admin/dashboard"
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* رسالة التحديث */}
        {message && (
          <div className="mt-4 rounded-[var(--radius-md)] bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* إعدادات العمولة */}
        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
          <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
            Commission Settings
          </h2>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                Commission Rate (%)
              </label>
              <input
                type="number"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="w-32 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                min="0"
                max="100"
                step="0.5"
              />
            </div>
            <button
              onClick={handleSaveCommission}
              className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-2 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
            >
              Save Rate
            </button>
          </div>
        </div>

        {/* إجمالي العمولات */}
        <div className="mt-6 rounded-[var(--radius-lg)] bg-[var(--color-olive)] p-6 text-[var(--color-ivory)]">
          <p className="text-sm font-medium uppercase tracking-[0.2em] opacity-80">
            Total Commission
          </p>
          <p className="mt-1 text-4xl font-bold">
            ${totalCommission.toFixed(2)}
          </p>
          <p className="mt-1 text-sm opacity-80">
            Based on {summary.reduce((acc, s) => acc + s.orderCount, 0)} completed orders
          </p>
        </div>

        {/* تفاصيل العمولات حسب الحرفي */}
        {summary.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              No completed orders yet
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Commissions will appear here once orders are delivered
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <div className="min-w-full rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
              {/* رأس الجدول */}
              <div className="grid grid-cols-5 gap-4 border-b border-[var(--border-soft)] bg-[var(--surface-muted)] px-6 py-3 text-xs font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                <span>Artisan</span>
                <span>Orders</span>
                <span>Total Sales</span>
                <span>Commission</span>
                <span>Net Amount</span>
              </div>

              {/* صفوف الجدول */}
              {summary.map((item) => (
                <div
                  key={item.artisan}
                  className="grid grid-cols-5 gap-4 border-b border-[var(--border-soft)] px-6 py-4 text-sm last:border-0 hover:bg-[var(--surface-muted)]"
                >
                  <span className="font-medium text-[var(--color-espresso)]">
                    {item.artisan}
                  </span>
                  <span>{item.orderCount}</span>
                  <span className="text-[var(--color-espresso)]">
                    ${item.totalSales.toFixed(2)}
                  </span>
                  <span className="text-[var(--color-copper)]">
                    ${item.commission.toFixed(2)}
                  </span>
                  <span className="font-medium text-[var(--color-olive)]">
                    ${item.netAmount.toFixed(2)}
                  </span>
                </div>
              ))}

              {/* إجمالي الجدول */}
              <div className="grid grid-cols-5 gap-4 border-t border-[var(--border-soft)] bg-[var(--surface-muted)] px-6 py-4 text-sm font-bold">
                <span>Total</span>
                <span>{summary.reduce((acc, s) => acc + s.orderCount, 0)}</span>
                <span>
                  ${summary.reduce((acc, s) => acc + s.totalSales, 0).toFixed(2)}
                </span>
                <span className="text-[var(--color-copper)]">
                  ${summary.reduce((acc, s) => acc + s.commission, 0).toFixed(2)}
                </span>
                <span className="text-[var(--color-olive)]">
                  ${summary.reduce((acc, s) => acc + s.netAmount, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import Link from "next/link";

type CartItem = {
  slug: string;
  artisan: string;
  name: string;
  price: number;
};

type Order = {
  id: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    notes: string;
  };
  paymentMethod: string;
  items: CartItem[];
  total: number;
  status: string;
  createdAt: string;
};

type Payout = {
  id: string;
  orderId: string;
  artisan: string;
  grossSale: number;
  discount: number;
  commission: number;
  taxes: number;
  netAmount: number;
  status: "pending" | "eligible" | "paid";
  createdAt: string;
  paidAt?: string;
};

export default function ArtisanPayoutsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState(0.15);

  const artisanName = "Ahmed Hassan";

  const calculatePayout = (order: Order): Payout | null => {
    // ✅ نتحقق من وجود items
    if (!order.items || !Array.isArray(order.items)) return null;

    const artisanItems = order.items.filter(
      (item) => item.artisan === artisanName
    );
    if (artisanItems.length === 0) return null;

    // ✅ نتحقق من وجود price (لو مش موجود نخليها 0)
    const grossSale = artisanItems.reduce((sum, item) => {
      const price = typeof item.price === 'number' ? item.price : 0;
      return sum + price;
    }, 0);

    const discount = 0;
    const commission = grossSale * commissionRate;
    const taxes = 0;
    const netAmount = grossSale - commission - taxes;

    let status: "pending" | "eligible" | "paid" = "pending";
    if (order.status === "تم التسليم") {
      status = "eligible";
    }

    return {
      id: `payout-${order.id}`,
      orderId: order.id,
      artisan: artisanName,
      grossSale,
      discount,
      commission,
      taxes,
      netAmount,
      status,
      createdAt: order.createdAt || new Date().toISOString(),
    };
  };

  const loadPayouts = () => {
    try {
      const storedOrders = localStorage.getItem("irth-orders");
      const allOrders: Order[] = storedOrders ? JSON.parse(storedOrders) : [];

      const artisanOrders = allOrders.filter((order) =>
        order.items?.some((item) => item.artisan === artisanName)
      );

      setOrders(artisanOrders);

      const calculatedPayouts = artisanOrders
        .map((order) => calculatePayout(order))
        .filter((p): p is Payout => p !== null);

      setPayouts(calculatedPayouts);
    } catch (error) {
      console.error("Error loading payouts:", error);
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isAuth = localStorage.getItem("irth-artisan-auth");
    if (!isAuth) {
      router.push("/artisan/login");
      return;
    }
    loadPayouts();
  }, [router]);

  // ✅ دالة مساعدة عشان نحمي `toFixed`
  const safeToFixed = (value: number, digits: number = 2): string => {
    if (typeof value !== 'number' || isNaN(value)) return '0.00';
    return value.toFixed(digits);
  };

  const totalGrossSale = payouts.reduce((sum, p) => sum + (p.grossSale || 0), 0);
  const totalCommission = payouts.reduce((sum, p) => sum + (p.commission || 0), 0);
  const totalTaxes = payouts.reduce((sum, p) => sum + (p.taxes || 0), 0);
  const totalNetAmount = payouts.reduce((sum, p) => sum + (p.netAmount || 0), 0);
  const eligiblePayouts = payouts.filter((p) => p.status === "eligible");

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري تحميل المستحقات...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        {/* عنوان الصفحة */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Artisan Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl font-normal text-[var(--color-espresso)]">
              💰 المستحقات والمدفوعات
            </h1>
            <p className="text-[var(--text-secondary)]">
              تتبع مبيعاتك ومستحقاتك المالية
            </p>
          </div>

          <Link
            href="/artisan/payouts/settings"
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
          >
            ⚙️ إعدادات الصرف
          </Link>
        </div>

        {/* بطاقات الإحصائيات السريعة */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <p className="text-sm text-[var(--text-muted)]">إجمالي المبيعات</p>
            <p className="mt-2 text-3xl font-bold text-[var(--color-espresso)]">
              ${safeToFixed(totalGrossSale)}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <p className="text-sm text-[var(--text-muted)]">عمولة إرث</p>
            <p className="mt-2 text-3xl font-bold text-[var(--color-copper)]">
              ${safeToFixed(totalCommission)}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <p className="text-sm text-[var(--text-muted)]">المستحق (الصافي)</p>
            <p className="mt-2 text-3xl font-bold text-[var(--color-olive)]">
              ${safeToFixed(totalNetAmount)}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <p className="text-sm text-[var(--text-muted)]">المستحق للصرف</p>
            <p className="mt-2 text-3xl font-bold text-[var(--color-terracotta)]">
              ${safeToFixed(eligiblePayouts.reduce((sum, p) => sum + (p.netAmount || 0), 0))}
            </p>
          </div>
        </div>

        {/* تفاصيل المستحقات */}
        {payouts.length === 0 ? (
          <div className="mt-16 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              🎉 مفيش مستحقات حالياً
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              لما تيجي طلبات جديدة، هتظهر هنا
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            {payouts.map((payout) => {
              const order = orders.find((o) => o.id === payout.orderId);
              return (
                <div
                  key={payout.id}
                  className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 transition hover:shadow-[var(--shadow-card)]"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        رقم الطلب
                      </p>
                      <p className="font-mono text-sm font-bold text-[var(--color-espresso)]">
                        {payout.orderId}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {payout.createdAt}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          payout.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : payout.status === "eligible"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {payout.status === "paid"
                          ? "✅ تم الصرف"
                          : payout.status === "eligible"
                          ? "⏳ مستحق للصرف"
                          : "⏳ قيد الانتظار"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[var(--border-soft)] pt-4 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">إجمالي المبيعات</p>
                      <p className="font-medium text-[var(--color-espresso)]">
                        ${safeToFixed(payout.grossSale)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">عمولة إرث</p>
                      <p className="font-medium text-[var(--color-copper)]">
                        -${safeToFixed(payout.commission)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">الضرائب</p>
                      <p className="font-medium text-[var(--text-muted)]">
                        -${safeToFixed(payout.taxes)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">صافي المستحق</p>
                      <p className="font-bold text-[var(--color-olive)]">
                        ${safeToFixed(payout.netAmount)}
                      </p>
                    </div>
                  </div>

                  {order && order.items && (
                    <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        المنتجات
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {order.items
                          .filter((item) => item.artisan === artisanName)
                          .map((item, index) => (
                            <span
                              key={index}
                              className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--text-secondary)]"
                            >
                              {item.name || "منتج"} (${safeToFixed(item.price || 0)})
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
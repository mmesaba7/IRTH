"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "../components/Header";
import Link from "next/link";

// نفس تعريف الطلب اللي في صفحة الدفع
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

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    // نجيب الطلب من localStorage
    const orders: Order[] = JSON.parse(
      localStorage.getItem("irth-orders") || "[]"
    );
    const foundOrder = orders.find((o) => o.id === orderId);

    setOrder(foundOrder || null);
    setLoading(false);
  }, [orderId]);

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

  if (!order) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 flex-col items-center justify-center gap-5">
          <p className="text-lg text-[var(--text-secondary)]">
            عفواً، لم نتمكن من العثور على طلبك
          </p>
          <Link
            href="/"
            className="text-sm font-medium text-[var(--color-copper)] hover:underline"
          >
            العودة للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  // تجميع المنتجات حسب الحرفي في صفحة النجاح (نفس الفكرة)
  const groupedByArtisan = order.items.reduce((acc, item) => {
    if (!acc[item.artisan]) {
      acc[item.artisan] = [];
    }
    acc[item.artisan].push(item);
    return acc;
  }, {} as Record<string, typeof order.items>);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
        {/* رسالة النجاح */}
        <div className="rounded-[var(--radius-lg)] border border-green-500/20 bg-green-50 p-8 text-center">
          <div className="text-6xl">🎉</div>
          <h1 className="mt-4 font-[var(--font-display)] text-4xl font-normal text-[var(--color-espresso)]">
            Your order is confirmed!
          </h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            شكراً لك على طلبك. سنقوم بتجهيزه وإعلامك بأحدث المستجدات.
          </p>

          <div className="mt-6 inline-block rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-6 py-3">
            <p className="text-sm text-[var(--text-muted)]">رقم الطلب</p>
            <p className="font-mono text-lg font-bold text-[var(--color-espresso)]">
              {order.id}
            </p>
          </div>
        </div>

        {/* تفاصيل الطلب */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_400px]">
          {/* العمود الأيمن: تفاصيل الشحن */}
          <div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-7">
              <h2 className="text-lg font-medium text-[var(--color-espresso)]">
                Shipping details
              </h2>

              <div className="mt-5 space-y-3 text-sm">
                <div>
                  <p className="text-[var(--text-muted)]">الاسم</p>
                  <p className="font-medium text-[var(--color-espresso)]">
                    {order.customer.name}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">الهاتف</p>
                  <p className="font-medium text-[var(--color-espresso)]">
                    {order.customer.phone}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">العنوان</p>
                  <p className="font-medium text-[var(--color-espresso)]">
                    {order.customer.address}
                  </p>
                </div>
                {order.customer.notes && (
                  <div>
                    <p className="text-[var(--text-muted)]">ملاحظات</p>
                    <p className="font-medium text-[var(--color-espresso)]">
                      {order.customer.notes}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[var(--text-muted)]">طريقة الدفع</p>
                  <p className="font-medium text-[var(--color-espresso)]">
                    {order.paymentMethod}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">حالة الطلب</p>
                  <p className="font-medium text-green-600">{order.status}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">تاريخ الطلب</p>
                  <p className="font-medium text-[var(--color-espresso)]">
                    {order.createdAt}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* العمود الأيسر: ملخص المنتجات حسب الحرفي */}
          <div>
            <div className="rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-7">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-olive)]">
                Order summary
              </p>

              <div className="mt-6 space-y-6">
                {Object.entries(groupedByArtisan).map(([artisan, items]) => (
                  <div
                    key={artisan}
                    className="border-b border-[var(--border-soft)] pb-5 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-[var(--color-espresso)]">
                        🧑‍🎨 {artisan}
                      </p>
                      <p className="text-sm font-medium text-[var(--color-copper)]">
                        ${items.reduce((sum, item) => sum + item.price, 0)}
                      </p>
                    </div>

                    <div className="mt-3 space-y-2">
                      {items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-[var(--text-secondary)]">
                            {item.name}
                          </span>
                          <span className="text-[var(--color-espresso)]">
                            ${item.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-[var(--border-soft)] pt-5">
                <span className="font-medium text-[var(--color-espresso)]">
                  Total
                </span>
                <span className="text-2xl font-medium text-[var(--color-copper)]">
                  ${order.total}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* أزرار إضافية */}
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-8 py-3 text-sm font-medium text-[var(--color-espresso)] transition hover:bg-[var(--surface-muted)]"
          >
            Continue shopping
          </Link>
          <Link
            href="/account/orders"
            className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-8 py-3 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
          >
            View my orders
          </Link>
        </div>
      </section>
    </main>
  );
}
export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--background)]">
          <Header />
          <div className="flex h-96 items-center justify-center">
            <p className="text-[var(--text-secondary)]">
              جاري تحميل تفاصيل الطلب...
            </p>
          </div>
        </main>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
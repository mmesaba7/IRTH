"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";

// نفس تعريف الطلب اللي في صفحة الدفع
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

export default function ArtisanOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // اسم الحرفي الحالي (مؤقت لحد ما نعمل تسجيل دخول حقيقي)
  // لازم يبقى مطابق للاسم اللي في ملف products.ts (Ahmed Hassan)
  const artisanName = "Ahmed Hassan";

  // دالة لجلب الطلبات من localStorage
  const loadOrders = () => {
    const allOrders: Order[] = JSON.parse(
      localStorage.getItem("irth-orders") || "[]"
    );

    // هنا بنصفى الطلبات: نجيب بس الطلبات اللي فيها منتجات من الحرفي ده
    const filteredOrders = allOrders.filter((order) =>
      order.items.some((item) => item.artisan === artisanName)
    );

    // نرتبهم من الأحدث للأقدم
    filteredOrders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setOrders(filteredOrders);
    setLoading(false);
  };

  // أول ما الصفحة تتحمل، نجيب الطلبات
  useEffect(() => {
    // نتأكد من تسجيل الدخول
    const isAuth = localStorage.getItem("irth-artisan-auth");
    if (!isAuth) {
      router.push("/artisan/login");
      return;
    }
    loadOrders();
  }, [router]);

  // دالة تغيير حالة الطلب
  const updateOrderStatus = (orderId: string, newStatus: string) => {
    const allOrders: Order[] = JSON.parse(
      localStorage.getItem("irth-orders") || "[]"
    );

    // نعدل حالة الطلب المطلوب
    const updatedOrders = allOrders.map((order) => {
      if (order.id === orderId) {
        return { ...order, status: newStatus };
      }
      return order;
    });

    // نحفظ التغييرات
    localStorage.setItem("irth-orders", JSON.stringify(updatedOrders));

    // نعيد تحميل الطلبات عشان تظهر محدثة
    loadOrders();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري تحميل الطلبات...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        {/* عنوان الصفحة */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Artisan Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl font-normal text-[var(--color-espresso)]">
              📦 إدارة الطلبات
            </h1>
            <p className="text-[var(--text-secondary)]">
              الطلبات اللي فيها منتجات من حضرتك
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("irth-artisan-auth");
              router.push("/artisan/login");
            }}
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
          >
            تسجيل خروج
          </button>
        </div>

        {/* عرض الطلبات */}
        {orders.length === 0 ? (
          <div className="mt-16 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              🎉 مفيش طلبات جديدة دلوقتي
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              استنى العملاء يطلبوا منتجاتك، وهتظهر هنا
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-sm transition hover:shadow-md"
              >
                {/* رقم الطلب وتاريخه */}
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      Order ID
                    </p>
                    <p className="font-mono text-lg font-bold text-[var(--color-espresso)]">
                      {order.id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      تاريخ الطلب
                    </p>
                    <p className="text-sm text-[var(--color-espresso)]">
                      {order.createdAt}
                    </p>
                  </div>
                </div>

                {/* العميل */}
                <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    العميل
                  </p>
                  <p className="text-lg font-medium text-[var(--color-espresso)]">
                    {order.customer.name}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    طريقة الدفع: {order.paymentMethod}
                  </p>
                </div>

                {/* المنتجات (المفروض تكون تابعة للحرفي ده) */}
                <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    المنتجات المطلوبة
                  </p>
                  <div className="mt-2 space-y-2">
                    {order.items
                      .filter((item) => item.artisan === artisanName)
                      .map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-4 py-2"
                        >
                          <span className="font-medium text-[var(--color-espresso)]">
                            {item.name}
                          </span>
                          <span className="text-sm text-[var(--color-copper)]">
                            ${item.price}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* الإجمالي وحالة الطلب */}
                <div className="mt-4 flex flex-col items-start justify-between gap-4 border-t border-[var(--border-soft)] pt-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      الإجمالي الكلي للطلب
                    </p>
                    <p className="text-2xl font-bold text-[var(--color-copper)]">
                      ${order.total}
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--text-muted)]">الحالة:</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          order.status === "تم استلام الطلب"
                            ? "bg-yellow-100 text-yellow-700"
                            : order.status === "قيد التجهيز"
                            ? "bg-blue-100 text-blue-700"
                            : order.status === "جاهز للشحن"
                            ? "bg-purple-100 text-purple-700"
                            : order.status === "تم التسليم"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    {/* أزرار تغيير الحالة (الحرفي يتحكم فيها) */}
                    <div className="flex flex-wrap gap-2">
                      {order.status === "تم استلام الطلب" && (
                        <button
                          type="button"
                          onClick={() =>
                            updateOrderStatus(order.id, "قيد التجهيز")
                          }
                          className="rounded-[var(--radius-md)] bg-blue-500 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-blue-600"
                        >
                          بدأ التجهيز
                        </button>
                      )}

                      {order.status === "قيد التجهيز" && (
                        <button
                          type="button"
                          onClick={() =>
                            updateOrderStatus(order.id, "جاهز للشحن")
                          }
                          className="rounded-[var(--radius-md)] bg-purple-500 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-purple-600"
                        >
                          جاهز للشحن
                        </button>
                      )}

                      {order.status === "جاهز للشحن" && (
                        <span className="rounded-[var(--radius-md)] bg-gray-200 px-4 py-1.5 text-xs font-medium text-gray-600">
                          في انتظار شركة الشحن
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
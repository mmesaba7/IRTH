"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import { useRouter } from "next/navigation";

// تعريف شكل العنصر في العربة
type CartItem = {
  slug: string;
  artisan: string;
  name: string;
  price: number;
};

// تعريف شكل الطلب النهائي
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

// ✅ تعريف شكل الإشعار (جديد)
type Notification = {
  id: string;
  userId: string;        // معرف المستخدم (العميل، الحرفي، الأدمن)
  userType: "buyer" | "artisan" | "admin";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  orderId?: string;      // رقم الطلب المرتبط (اختياري)
};

export default function CheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // بيانات العميل
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");

  useEffect(() => {
    const cart: CartItem[] = JSON.parse(
      localStorage.getItem("irth-cart") || "[]"
    );
    setCartItems(cart);
    setLoading(false);

    if (cart.length === 0) {
      router.push("/cart");
    }
  }, [router]);

  // تجميع المنتجات حسب الحرفي
  const groupedByArtisan = cartItems.reduce((acc, item) => {
    if (!acc[item.artisan]) {
      acc[item.artisan] = [];
    }
    acc[item.artisan].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  const artisanTotals = Object.entries(groupedByArtisan).reduce(
    (acc, [artisan, items]) => {
      acc[artisan] = items.reduce((sum, item) => sum + item.price, 0);
      return acc;
    },
    {} as Record<string, number>
  );

  const total = cartItems.reduce((sum, item) => sum + item.price, 0);

  // ✅ دالة مساعدة لحفظ الإشعارات (جديدة)
  const addNotification = (notification: Notification) => {
    const notifications = JSON.parse(
      localStorage.getItem("irth-notifications") || "[]"
    );
    notifications.push(notification);
    localStorage.setItem("irth-notifications", JSON.stringify(notifications));
  };

  // دالة تأكيد الطلب (معدلة)
  const handlePlaceOrder = () => {
    if (!customerName || !customerPhone || !customerAddress) {
      alert("من فضلك املأ جميع البيانات المطلوبة (الاسم، التليفون، العنوان)");
      return;
    }

    const order: Order = {
      id: `IRTH-${Date.now()}`,
      customer: {
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
        notes: customerNotes,
      },
      paymentMethod: paymentMethod === "cod" ? "الدفع عند الاستلام" : "الدفع الإلكتروني",
      items: cartItems,
      total: total,
      status: "تم استلام الطلب",
      createdAt: new Date().toLocaleString("ar-EG"),
    };

    // حفظ الطلب
    const orders = JSON.parse(localStorage.getItem("irth-orders") || "[]");
    orders.push(order);
    localStorage.setItem("irth-orders", JSON.stringify(orders));

    // ✅ حفظ الإشعارات (جديد)
    const now = new Date().toISOString();

    // ١- إشعار للعميل
    addNotification({
      id: `notif-${Date.now()}-buyer`,
      userId: "buyer-" + customerName.replace(/\s/g, "-").toLowerCase(),
      userType: "buyer",
      title: "✅ تم تأكيد طلبك",
      message: `طلبك رقم ${order.id} تم استلامه بنجاح. سنقوم بتجهيزه وإعلامك بأحدث المستجدات.`,
      read: false,
      createdAt: now,
      orderId: order.id,
    });

    // ٢- إشعار لكل حرفي (جديد)
    const artisanNames = Object.keys(groupedByArtisan);
    artisanNames.forEach((artisan) => {
      const artisanItems = groupedByArtisan[artisan];
      const totalArtisanPrice = artisanItems.reduce((sum, item) => sum + item.price, 0);
      
      addNotification({
        id: `notif-${Date.now()}-artisan-${artisan.replace(/\s/g, "-").toLowerCase()}`,
        userId: `artisan-${artisan.replace(/\s/g, "-").toLowerCase()}`,
        userType: "artisan",
        title: "📦 طلب جديد",
        message: `لديك طلب جديد رقم ${order.id} من ${customerName} بقيمة $${totalArtisanPrice.toFixed(2)}.`,
        read: false,
        createdAt: now,
        orderId: order.id,
      });
    });

    // ٣- إشعار للأدمن (جديد)
    addNotification({
      id: `notif-${Date.now()}-admin`,
      userId: "admin-irth",
      userType: "admin",
      title: "📦 طلب جديد",
      message: `طلب جديد رقم ${order.id} من ${customerName} بقيمة $${total.toFixed(2)}.`,
      read: false,
      createdAt: now,
      orderId: order.id,
    });

    // نفضي العربية
    localStorage.setItem("irth-cart", "[]");
    window.dispatchEvent(new Event("irth-cart-updated"));

    // نودي العميل على صفحة نجاح الطلب
    router.push(`/order-success?id=${order.id}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p>جاري التحميل...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
          Secure checkout
        </p>

        <h1 className="mt-3 font-[var(--font-display)] text-5xl font-normal text-[var(--color-espresso)]">
          Complete your order
        </h1>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_400px]">
          {/* العمود الأيمن: بيانات العميل */}
          <div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-7">
              <h2 className="text-lg font-medium text-[var(--color-espresso)]">
                Shipping details
              </h2>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                    Full name *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                    placeholder="أحمد محمد"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                    Phone number *
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                    placeholder="01001234567"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                    Delivery address *
                  </label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                    placeholder="شارع النيل، مدينة الأقصر"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                    Order notes (optional)
                  </label>
                  <textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                    placeholder="أي تعليمات إضافية للتوصيل"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                    Payment method *
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cod")}
                      className={`flex-1 rounded-[var(--radius-md)] border px-4 py-3 text-sm transition ${
                        paymentMethod === "cod"
                          ? "border-[var(--color-copper)] bg-[var(--color-copper)]/5 text-[var(--color-copper)]"
                          : "border-[var(--border-soft)] hover:border-[var(--color-copper)]"
                      }`}
                    >
                      💵 الدفع عند الاستلام
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("online")}
                      className={`flex-1 rounded-[var(--radius-md)] border px-4 py-3 text-sm transition ${
                        paymentMethod === "online"
                          ? "border-[var(--color-copper)] bg-[var(--color-copper)]/5 text-[var(--color-copper)]"
                          : "border-[var(--border-soft)] hover:border-[var(--color-copper)]"
                      }`}
                    >
                      💳 الدفع الإلكتروني
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* العمود الأيسر: ملخص الطلب + تقسيم الحرفيين */}
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
                        ${artisanTotals[artisan]}
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
                  ${total}
                </span>
              </div>

              <button
                type="button"
                onClick={handlePlaceOrder}
                className="mt-7 w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-center text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
              >
                Confirm order
              </button>

              <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
                by clicking confirm, you agree to our terms
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
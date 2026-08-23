"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";

// تعريف شكل العنصر اللي هيتخزن في العربية
type CartItem = {
  slug: string;
  artisan: string;
  name: string;
  price: number;
};

export default function CartPage() {
  // هتخزن مصفوفة من الكائنات (العربية كلها)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // هتخزن الكميات المجمعة لكل منتج (مفتاح = slug, قيمة = العدد)
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // دالة لتحديث البيانات من localStorage
  const loadCart = () => {
    const cart: CartItem[] = JSON.parse(
      localStorage.getItem("irth-cart") || "[]"
    );

    // تجميع الكميات: لو في منتجين بنفس الـ slug، نزود العدد
    const grouped: Record<string, number> = {};
    cart.forEach((item) => {
      grouped[item.slug] = (grouped[item.slug] || 0) + 1;
    });

    setCartItems(cart);
    setQuantities(grouped);
  };

  // أول ما الصفحة تتحمل، نجيب البيانات
  useEffect(() => {
    loadCart();

    // نسمع لأي تغيير في العربية (لو اتغيرت من مكان تاني)
    window.addEventListener("irth-cart-updated", loadCart);
    return () => {
      window.removeEventListener("irth-cart-updated", loadCart);
    };
  }, []);

  // حساب الإجمالي
  const total = Object.entries(quantities).reduce(
    (sum, [slug, quantity]) => {
      // نجيب العنصر الأول من العربية اللي عنده الـ slug ده
      const item = cartItems.find((i) => i.slug === slug);
      return sum + (item?.price || 0) * quantity;
    },
    0
  );

  // دالة لحفظ العربية في localStorage بعد أي تعديل
  const saveCart = (updatedCart: CartItem[]) => {
    localStorage.setItem("irth-cart", JSON.stringify(updatedCart));
    setCartItems(updatedCart);
    // نعيد تجميع الكميات
    const grouped: Record<string, number> = {};
    updatedCart.forEach((item) => {
      grouped[item.slug] = (grouped[item.slug] || 0) + 1;
    });
    setQuantities(grouped);
    window.dispatchEvent(new Event("irth-cart-updated"));
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
          Your selection
        </p>

        <h1 className="mt-3 font-[var(--font-display)] text-5xl font-normal text-[var(--color-espresso)]">
          Your cart
        </h1>

        {cartItems.length === 0 ? (
          <div className="mt-12 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              Your cart is empty.
            </p>
            <a
              href="/"
              className="mt-5 inline-block text-sm font-medium text-[var(--color-copper)]"
            >
              Explore crafts →
            </a>
          </div>
        ) : (
          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              {Object.entries(quantities).map(([slug, quantity]) => {
                // نجيب أول عنصر من العربية عشان نعرض بياناته
                const item = cartItems.find((i) => i.slug === slug);
                if (!item) return null;

                return (
                  <div
                    key={slug}
                    className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5"
                  >
                    <div className="flex gap-5">
                      <div
                        className={`h-28 w-28 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-terracotta)]`}
                      />

                      <div className="flex flex-1 items-start justify-between gap-4">
                        <div>
                          <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
                            {item.name}
                          </h2>

                          <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            By {item.artisan}
                          </p>

                          <div className="mt-4 flex items-center rounded-[var(--radius-md)] border border-[var(--border-soft)]">
                            <button
                              type="button"
                              onClick={() => {
                                if (quantity <= 1) return;
                                // نمسح أول عنصر من العربية لهذا الـ slug
                                const index = cartItems.findIndex(
                                  (i) => i.slug === slug
                                );
                                if (index === -1) return;
                                const newCart = [...cartItems];
                                newCart.splice(index, 1);
                                saveCart(newCart);
                              }}
                              className="flex h-9 w-9 items-center justify-center text-lg hover:text-[var(--color-copper)]"
                            >
                              −
                            </button>

                            <span className="w-10 text-center text-sm">
                              {quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                // نضيف عنصر جديد بنفس بيانات الـ slug
                                const newCart = [
                                  ...cartItems,
                                  {
                                    slug: item.slug,
                                    artisan: item.artisan,
                                    name: item.name,
                                    price: item.price,
                                  },
                                ];
                                saveCart(newCart);
                              }}
                              className="flex h-9 w-9 items-center justify-center text-lg hover:text-[var(--color-copper)]"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-4">
                          <p className="font-medium text-[var(--color-copper)]">
                            ${item.price * quantity}
                          </p>

                          <button
                            type="button"
                            onClick={() => {
                              // نمسح كل العناصر اللي ليها الـ slug ده
                              const newCart = cartItems.filter(
                                (i) => i.slug !== slug
                              );
                              saveCart(newCart);
                            }}
                            className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--color-copper)]"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="h-fit rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-7">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-olive)]">
                Summary
              </p>

              <div className="mt-6 flex items-center justify-between border-b border-[var(--border-soft)] pb-5">
                <span className="text-sm text-[var(--text-secondary)]">
                  Items
                </span>
                <span className="text-sm">
                  {cartItems.length}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="font-medium text-[var(--color-espresso)]">
                  Total
                </span>
                <span className="text-xl font-medium text-[var(--color-copper)]">
                  ${total}
                </span>
              </div>

              <a
                href="/checkout"
                className="mt-7 block w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-center text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
              >
                Continue to checkout
              </a>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
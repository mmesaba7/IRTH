"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// تعريف شكل الإشعار (نفس اللي في checkout)
type Notification = {
  id: string;
  userId: string;
  userType: "buyer" | "artisan" | "admin";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  orderId?: string;
};

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const [isMounted, setIsMounted] = useState(false);

  // ✅ حالة الإشعارات (جديدة)
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // تحديد نوع المستخدم (مؤقت، هنربطه بالتسجيل لاحقاً)
  const userType: "buyer" | "artisan" | "admin" = "buyer"; // هنغيرها حسب المستخدم
  const userId = "buyer-أحمد-محمد"; // مؤقت

  const updateCounts = () => {
    const saved = JSON.parse(
      localStorage.getItem("irth-saved-products") || "[]"
    );
    const cart = JSON.parse(
      localStorage.getItem("irth-cart") || "[]"
    );
    setSavedCount(saved.length);
    setCartCount(cart.length);
  };

  // ✅ دالة لجلب الإشعارات (جديدة)
  const loadNotifications = () => {
    const allNotifications: Notification[] = JSON.parse(
      localStorage.getItem("irth-notifications") || "[]"
    );
    // فلترة الإشعارات الخاصة بالمستخدم الحالي
    const userNotifications = allNotifications.filter(
      (n) => n.userId === userId || n.userType === userType
    );
    setNotifications(userNotifications);
    const unread = userNotifications.filter((n) => !n.read).length;
    setUnreadCount(unread);
  };

  // ✅ دالة لتحديد الإشعار كمقروء (جديدة)
  const markAsRead = (id: string) => {
    const allNotifications: Notification[] = JSON.parse(
      localStorage.getItem("irth-notifications") || "[]"
    );
    const updated = allNotifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    localStorage.setItem("irth-notifications", JSON.stringify(updated));
    loadNotifications(); // تحديث القائمة
  };

  // ✅ دالة لتحديد كل الإشعارات كمقروءة (جديدة)
  const markAllAsRead = () => {
    const allNotifications: Notification[] = JSON.parse(
      localStorage.getItem("irth-notifications") || "[]"
    );
    const updated = allNotifications.map((n) =>
      n.userId === userId || n.userType === userType
        ? { ...n, read: true }
        : n
    );
    localStorage.setItem("irth-notifications", JSON.stringify(updated));
    loadNotifications();
  };

  useEffect(() => {
    const savedLocale = localStorage.getItem("irth-locale") as "ar" | "en" | null;
    if (savedLocale) {
      setLocale(savedLocale);
    }
    setIsMounted(true);
    updateCounts();
    loadNotifications();

    // الاستماع للتغييرات في الإشعارات
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "irth-notifications") {
        loadNotifications();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("irth-cart-updated", updateCounts);
    window.addEventListener("irth-saved-updated", updateCounts);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("irth-cart-updated", updateCounts);
      window.removeEventListener("irth-saved-updated", updateCounts);
    };
  }, []);

  const toggleLocale = () => {
    const newLocale = locale === "ar" ? "en" : "ar";
    setLocale(newLocale);
    localStorage.setItem("irth-locale", newLocale);
    window.location.reload();
  };

  return (
    <header className="border-b border-[var(--border-soft)] bg-[var(--background)]">
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-5">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <Link
            href="/"
            className="font-[var(--font-display)] text-2xl tracking-[0.08em] text-[var(--color-espresso)]"
          >
            IRTH
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-9 text-sm md:flex">
            <Link href="/crafts" className="transition-colors hover:text-[var(--color-copper)]">
              Discover
            </Link>
            <Link href="/crafts" className="transition-colors hover:text-[var(--color-copper)]">
              Crafts
            </Link>
            <Link href="/artisans" className="transition-colors hover:text-[var(--color-copper)]">
              Artisans
            </Link>
            <Link href="/countries" className="transition-colors hover:text-[var(--color-copper)]">
              Countries
            </Link>
            <Link
  href="/recently-viewed"
  className="transition-colors hover:text-[var(--color-copper)]"
>
  Recently Viewed
</Link>
<Link
  href="/account/orders"
  className="transition-colors hover:text-[var(--color-copper)]"
>
  My Orders
</Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-5">

            {/* Mobile Menu */}
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-lg text-[var(--color-espresso)] transition-colors hover:text-[var(--color-copper)] md:hidden"
            >
              {menuOpen ? "✕" : "☰"}
            </button>

            {/* Search */}
            <button
              type="button"
              aria-label="Search"
              className="text-lg text-[var(--color-espresso)] transition-colors hover:text-[var(--color-copper)]"
            >
              ⌕
            </button>

            {/* 🔔 Notifications (جديد) - التعديل هنا */}
            <div className="relative flex items-center gap-1">
              <Link
                href="/notifications"
                className="relative text-lg text-[var(--color-espresso)] transition-colors hover:text-[var(--color-copper)]"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-terracotta)] px-1 text-[10px] text-[var(--color-ivory)]">
                    {unreadCount}
                  </span>
                )}
              </Link>

              <button
                type="button"
                aria-label="Toggle notifications dropdown"
                onClick={() => setShowNotifications(!showNotifications)}
                className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--color-copper)]"
              >
                ▼
              </button>

              {/* Dropdown الإشعارات */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-elevated)] z-50">
                  <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3">
                    <span className="text-sm font-medium text-[var(--color-espresso)]">
                      الإشعارات
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-[var(--color-copper)] hover:underline"
                      >
                        تحديد الكل كمقروء
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                      مفيش إشعارات جديدة
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border-soft)]">
                      {notifications.slice(0, 5).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markAsRead(notif.id);
                            setShowNotifications(false);
                          }}
                          className={`px-4 py-3 cursor-pointer transition hover:bg-[var(--surface-muted)] ${
                            !notif.read ? "bg-[var(--color-copper)]/5" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-[var(--color-espresso)]">
                                {notif.title}
                              </p>
                              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                {notif.message}
                              </p>
                              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                                {new Date(notif.createdAt).toLocaleString("ar-EG")}
                              </p>
                            </div>
                            {!notif.read && (
                              <span className="h-2 w-2 min-w-2 rounded-full bg-[var(--color-copper)]" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {notifications.length > 0 && (
                    <div className="border-t border-[var(--border-soft)] px-4 py-2 text-center">
                      <Link
                        href="/notifications"
                        className="text-xs text-[var(--color-copper)] hover:underline"
                        onClick={() => setShowNotifications(false)}
                      >
                        عرض كل الإشعارات
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Saved */}
            <Link
              href="/saved"
              aria-label="Saved items"
              className="relative text-lg text-[var(--color-espresso)] transition-colors hover:text-[var(--color-copper)]"
            >
              ♡
              {savedCount > 0 && (
                <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-copper)] px-1 text-[10px] text-[var(--color-ivory)]">
                  {savedCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              aria-label="Shopping cart"
              className="relative text-lg text-[var(--color-espresso)] transition-colors hover:text-[var(--color-copper)]"
            >
              🛒
              {cartCount > 0 && (
                <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-copper)] px-1 text-[10px] text-[var(--color-ivory)]">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* زر اللغة */}
            {isMounted && (
              <button
                type="button"
                onClick={toggleLocale}
                className="text-sm font-medium text-[var(--color-espresso)] transition-colors hover:text-[var(--color-copper)]"
              >
                {locale === "ar" ? "🇬🇧 EN" : "🇪🇬 عربي"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {menuOpen && (
        <div className="border-t border-[var(--border-soft)] bg-[var(--background)] md:hidden">
          <nav className="mx-auto max-w-[var(--container-max)] px-6 py-6">
            <div className="flex flex-col gap-5 text-sm">
              <Link
                href="/crafts"
                onClick={() => setMenuOpen(false)}
                className="transition-colors hover:text-[var(--color-copper)]"
              >
                Discover
              </Link>
              <Link
                href="/crafts"
                onClick={() => setMenuOpen(false)}
                className="transition-colors hover:text-[var(--color-copper)]"
              >
                Crafts
              </Link>
              <Link
                href="/artisans"
                onClick={() => setMenuOpen(false)}
                className="transition-colors hover:text-[var(--color-copper)]"
              >
                Artisans
              </Link>
              <Link
                href="/countries"
                onClick={() => setMenuOpen(false)}
                className="transition-colors hover:text-[var(--color-copper)]"
              >
                Countries
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
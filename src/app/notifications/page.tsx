"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import Link from "next/link";

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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = () => {
    const allNotifs: Notification[] = JSON.parse(
      localStorage.getItem("irth-notifications") || "[]"
    );
    // هنفترض إن المستخدم الحالي هو "buyer" عشان نختبر
    const userNotifs = allNotifs.filter(
      (n) => n.userType === "buyer" || n.userType === "admin"
    );
    // ترتيب من الأحدث للأقدم
    userNotifs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setNotifications(userNotifs);
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();

    // الاستماع لأي تغيير في الإشعارات
    window.addEventListener("storage", (e) => {
      if (e.key === "irth-notifications") {
        loadNotifications();
      }
    });

    return () => {
      window.removeEventListener("storage", () => {});
    };
  }, []);

  const markAsRead = (id: string) => {
    const allNotifs: Notification[] = JSON.parse(
      localStorage.getItem("irth-notifications") || "[]"
    );
    const updated = allNotifs.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    localStorage.setItem("irth-notifications", JSON.stringify(updated));
    loadNotifications();
  };

  const markAllAsRead = () => {
    const allNotifs: Notification[] = JSON.parse(
      localStorage.getItem("irth-notifications") || "[]"
    );
    const updated = allNotifs.map((n) => ({ ...n, read: true }));
    localStorage.setItem("irth-notifications", JSON.stringify(updated));
    loadNotifications();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-4xl px-6 py-10 md:py-16">
        {/* رأس الصفحة */}
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Notifications
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              🔔 Your Notifications
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {notifications.filter((n) => !n.read).length} unread
            </p>
          </div>
          <div className="flex gap-3">
            {notifications.filter((n) => !n.read).length > 0 && (
              <button
                onClick={markAllAsRead}
                className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
              >
                Mark all as read
              </button>
            )}
            <Link
              href="/"
              className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* قائمة الإشعارات */}
        {notifications.length === 0 ? (
          <div className="mt-16 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">🎉 No notifications yet</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Notifications will appear here when you have activity
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`rounded-[var(--radius-lg)] border border-[var(--border-soft)] p-5 transition hover:shadow-[var(--shadow-card)] ${
                  !notif.read ? "bg-[var(--surface-muted)]" : "bg-[var(--surface)]"
                }`}
                onClick={() => markAsRead(notif.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-[var(--color-espresso)]">
                      {notif.title}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {notif.message}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {new Date(notif.createdAt).toLocaleString("ar-EG")}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="h-3 w-3 rounded-full bg-[var(--color-copper)]" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
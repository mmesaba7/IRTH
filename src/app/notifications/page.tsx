"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import { createClient } from "@/lib/supabase/client";
import {
  EMPTY_NOTIFICATION_FEED,
  type NotificationFeed,
  type NotificationItem,
} from "@/lib/notifications";

function getLocale() {
  if (typeof window === "undefined") return "en" as const;
  return localStorage.getItem("irth-locale") === "ar" ? "ar" : "en";
}

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [feed, setFeed] = useState<NotificationFeed>(EMPTY_NOTIFICATION_FEED);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [locale, setLocale] = useState<"ar" | "en">("en");

  const load = async () => {
    setError("");
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setSignedIn(false);
      setFeed(EMPTY_NOTIFICATION_FEED);
      setLoading(false);
      return;
    }

    setSignedIn(true);
    const { data, error: rpcError } = await supabase.rpc("get_my_notifications", {
      p_limit: 100,
      p_offset: 0,
    });

    if (rpcError || !data || typeof data !== "object" || Array.isArray(data)) {
      setError("Unable to load notifications right now.");
      setFeed(EMPTY_NOTIFICATION_FEED);
      setLoading(false);
      return;
    }

    setFeed(data as NotificationFeed);
    setLoading(false);
  };

  useEffect(() => {
    setLocale(getLocale());
    void load();

    const refresh = () => void load();
    window.addEventListener("irth-notifications-updated", refresh);
    window.addEventListener("focus", refresh);

    return () => {
      window.removeEventListener("irth-notifications-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const markAllRead = async () => {
    const { error: rpcError } = await supabase.rpc("mark_all_my_notifications_read");
    if (rpcError) {
      setError("Unable to update notifications right now.");
      return;
    }

    window.dispatchEvent(new Event("irth-notifications-updated"));
  };

  const openNotification = async (item: NotificationItem) => {
    if (!item.readAt) {
      const { error: rpcError } = await supabase.rpc("mark_my_notification_read", {
        p_notification_id: item.id,
      });

      if (rpcError) {
        setError("Unable to update this notification right now.");
        return;
      }
    }

    window.dispatchEvent(new Event("irth-notifications-updated"));
    if (item.linkPath) router.push(item.linkPath);
  };

  const titleFor = (item: NotificationItem) =>
    locale === "ar" ? item.titleAr : item.titleEn;

  const bodyFor = (item: NotificationItem) =>
    locale === "ar" ? item.bodyAr : item.bodyEn;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-4xl px-6 py-10 md:py-16">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Notifications
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              {locale === "ar" ? "إشعاراتك" : "Your Notifications"}
            </h1>
            {signedIn && (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {feed.unreadCount} {locale === "ar" ? "غير مقروء" : "unread"}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {signedIn && feed.unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
              >
                {locale === "ar" ? "تحديد الكل كمقروء" : "Mark all as read"}
              </button>
            )}
            <Link
              href="/"
              className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
            >
              {locale === "ar" ? "العودة للرئيسية" : "Back to Home"}
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex h-72 items-center justify-center">
            <p className="text-[var(--text-secondary)]">Loading...</p>
          </div>
        ) : !signedIn ? (
          <div className="mt-12 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-8 text-center">
            <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
              {locale === "ar" ? "سجل الدخول لعرض إشعاراتك" : "Sign in to view notifications"}
            </h2>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {locale === "ar"
                ? "الإشعارات مرتبطة بحسابك ولا يتم عرضها للمستخدمين غير المسجلين."
                : "Notifications belong to your account and are not exposed to signed-out visitors."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/account/login" className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-5 py-3 text-sm font-medium text-[var(--color-ivory)]">
                Customer sign in
              </Link>
              <Link href="/artisan/login" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-3 text-sm font-medium text-[var(--color-espresso)]">
                Artisan sign in
              </Link>
              <Link href="/dashboard-admin/login" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-3 text-sm font-medium text-[var(--color-espresso)]">
                Admin sign in
              </Link>
            </div>
          </div>
        ) : error ? (
          <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-8 text-center">
            <p className="text-sm text-[var(--color-terracotta)]">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-4 text-sm font-medium text-[var(--color-copper)] hover:underline">
              Try again
            </button>
          </div>
        ) : feed.items.length === 0 ? (
          <div className="mt-12 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              {locale === "ar" ? "لا توجد إشعارات حتى الآن" : "No notifications yet"}
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {feed.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void openNotification(item)}
                className={`w-full rounded-[var(--radius-lg)] border border-[var(--border-soft)] p-5 text-left transition hover:shadow-[var(--shadow-card)] ${
                  !item.readAt ? "bg-[var(--surface-muted)]" : "bg-[var(--surface)]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-[var(--color-espresso)]">{titleFor(item)}</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{bodyFor(item)}</p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {new Date(item.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB")}
                    </p>
                  </div>
                  {!item.readAt && <span className="mt-1 h-3 w-3 rounded-full bg-[var(--color-copper)]" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

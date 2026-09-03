"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  EMPTY_NOTIFICATION_FEED,
  type NotificationFeed,
  type NotificationItem,
} from "@/lib/notifications";
import IrthIcon from "./IrthIcon";

function getLocale() {
  if (typeof window === "undefined") return "en" as const;
  return localStorage.getItem("irth-locale") === "ar" ? "ar" : "en";
}

function titleFor(item: NotificationItem, locale: "ar" | "en") {
  return locale === "ar" ? item.titleAr : item.titleEn;
}

function bodyFor(item: NotificationItem, locale: "ar" | "en") {
  return locale === "ar" ? item.bodyAr : item.bodyEn;
}

export default function NotificationBell() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [feed, setFeed] = useState<NotificationFeed>(EMPTY_NOTIFICATION_FEED);
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState<"ar" | "en">("en");

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setFeed(EMPTY_NOTIFICATION_FEED);
      return;
    }

    const { data, error } = await supabase.rpc("get_my_notifications", {
      p_limit: 5,
      p_offset: 0,
    });

    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
      setFeed(EMPTY_NOTIFICATION_FEED);
      return;
    }

    setFeed(data as NotificationFeed);
  }, [supabase]);

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
  }, [load]);

  const markAllRead = async () => {
    await supabase.rpc("mark_all_my_notifications_read");
    window.dispatchEvent(new Event("irth-notifications-updated"));
  };

  const openNotification = async (item: NotificationItem) => {
    if (!item.readAt) {
      await supabase.rpc("mark_my_notification_read", {
        p_notification_id: item.id,
      });
    }

    setOpen(false);
    window.dispatchEvent(new Event("irth-notifications-updated"));

    if (item.linkPath) router.push(item.linkPath);
  };

  return (
    <div className="relative flex items-center gap-0.5">
      <Link href="/notifications" aria-label="Notifications" className="irth-icon-button relative">
        <IrthIcon name="bell" className="h-5 w-5" />
        {feed.unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-copper)] px-1 text-[9px] text-white">
            {feed.unreadCount > 99 ? "99+" : feed.unreadCount}
          </span>
        )}
      </Link>

      <button
        type="button"
        aria-label="Toggle notifications dropdown"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="rounded-full px-1 py-2 text-[10px] text-current opacity-55 transition-opacity hover:opacity-100"
      >
        ▾
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[70] mt-2 max-h-96 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-elevated)]">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--color-espresso)]">
              {locale === "ar" ? "الإشعارات" : "Notifications"}
            </span>
            {feed.unreadCount > 0 && (
              <button type="button" onClick={() => void markAllRead()} className="text-xs font-medium text-[var(--color-copper)] hover:underline">
                {locale === "ar" ? "تحديد الكل كمقروء" : "Mark all read"}
              </button>
            )}
          </div>

          {feed.items.length === 0 ? (
            <div className="px-4 py-7 text-center text-sm text-[var(--text-muted)]">
              {locale === "ar" ? "لا توجد إشعارات" : "No notifications yet"}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-soft)]">
              {feed.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openNotification(item)}
                  className={`w-full px-4 py-3 text-start transition hover:bg-[var(--surface-muted)] ${!item.readAt ? "bg-[var(--color-copper)]/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-espresso)]">{titleFor(item, locale)}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{bodyFor(item, locale)}</p>
                    </div>
                    {!item.readAt && <span className="mt-1 h-2 w-2 min-w-2 rounded-full bg-[var(--color-copper)]" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-[var(--border-soft)] px-4 py-3 text-center">
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs font-semibold text-[var(--color-copper)] hover:underline">
              {locale === "ar" ? "عرض كل الإشعارات" : "View all notifications"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import OrderTrackingCard from "@/app/components/OrderTrackingCard";
import type { CustomerOrderTracking } from "@/lib/customerOrderTracking";

type GuestTrackingResponse = {
  order?: CustomerOrderTracking;
  error?: string;
};

export default function GuestTrackingClient({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<CustomerOrderTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const token = fragment.get("access")?.trim() ?? "";

    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      setError("This secure tracking link is incomplete or invalid.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    fetch("/api/order-tracking/guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ orderNumber, token }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as GuestTrackingResponse;
        if (controller.signal.aborted) return;

        if (!response.ok || !payload.order) {
          setError(payload.error ?? "Tracking link is invalid or unavailable.");
          return;
        }

        setOrder(payload.order);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("Unable to load tracking right now. Please try again.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-8 text-center">
        <p className="text-sm text-[var(--text-secondary)]">Loading secure tracking…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-8 text-center">
        <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
          Tracking unavailable
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">
          {error || "Tracking link is invalid or unavailable."}
        </p>
      </div>
    );
  }

  return <OrderTrackingCard order={order} defaultOpen />;
}

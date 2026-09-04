"use client";

import { useCallback, useEffect, useState } from "react";

type CancellationContext = {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  mode: "direct" | "review" | "pending_review" | "cancelled" | "unavailable";
  latestRequest: null | {
    id: string;
    status: string;
    requiresAdminReview: boolean;
    reason: string;
    submittedAt: string;
    resolvedAt: string | null;
    resolutionNote: string | null;
  };
};

type CancellationResult = {
  requestId: string | null;
  requestStatus: string;
  orderStatus: string;
  requiresAdminReview: boolean;
  changed: boolean;
};

export default function CancellationPanel({
  orderId,
  orderNumber,
  guestToken = null,
}: {
  orderId: string;
  orderNumber: string;
  guestToken?: string | null;
}) {
  const [context, setContext] = useState<CancellationContext | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let response: Response;
      if (guestToken) {
        response = await fetch("/api/cancellations/guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          referrerPolicy: "no-referrer",
          body: JSON.stringify({ action: "context", orderId, token: guestToken }),
        });
      } else {
        const query = new URLSearchParams({ orderId });
        response = await fetch(`/api/cancellations/customer?${query.toString()}`, { cache: "no-store" });
      }

      const body = await response.json();
      if (!response.ok || !body?.context) throw new Error(body?.error || "Unable to load cancellation options.");
      setContext(body.context as CancellationContext);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load cancellation options.");
    } finally {
      setLoading(false);
    }
  }, [guestToken, orderId]);

  useEffect(() => { void load(); }, [load]);

  async function submit() {
    const cleanReason = reason.trim();
    if (saving || cleanReason.length < 3) {
      setError("Write a short reason for the cancellation.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(guestToken ? "/api/cancellations/guest" : "/api/cancellations/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        referrerPolicy: "no-referrer",
        body: JSON.stringify(
          guestToken
            ? { action: "create", orderId, token: guestToken, reason: cleanReason }
            : { orderId, reason: cleanReason }
        ),
      });
      const body = await response.json();
      if (!response.ok || !body?.result) throw new Error(body?.error || "Unable to process cancellation.");
      const result = body.result as CancellationResult;

      if (result.orderStatus === "cancelled") {
        if (guestToken) {
          window.location.replace(`/track/${encodeURIComponent(orderNumber)}#access=${encodeURIComponent(guestToken)}`);
        } else {
          window.location.reload();
        }
        return;
      }

      setReason("");
      setMessage("Cancellation request sent to IRTH for review. The order remains active until IRTH approves it.");
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to process cancellation.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;
  if (!context) {
    return error ? <p className="mt-4 text-xs text-[var(--color-terracotta)]">{error}</p> : null;
  }
  if (context.mode === "unavailable") return null;

  if (context.mode === "cancelled") {
    return (
      <section className="mt-7 border-t border-[var(--border-soft)] pt-6">
        <p className="text-sm font-medium text-[var(--color-terracotta)]">This order has been cancelled.</p>
      </section>
    );
  }

  if (context.mode === "pending_review") {
    return (
      <section className="mt-7 border-t border-[var(--border-soft)] pt-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Cancellation</p>
        <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4">
          <p className="text-sm font-medium text-[var(--color-espresso)]">Cancellation request is under IRTH review.</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">The order remains active until IRTH approves the request.</p>
        </div>
        {message && <p className="mt-3 text-xs text-[var(--color-success)]">{message}</p>}
      </section>
    );
  }

  const requiresReview = context.mode === "review";

  return (
    <section className="mt-7 border-t border-[var(--border-soft)] pt-6">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Cancellation</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {requiresReview
          ? "Preparation has started, so cancellation requires IRTH review. The order stays active until approval."
          : "Preparation has not started yet. For the current COD beta, this cancellation can be applied immediately."}
      </p>
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Tell IRTH why you want to cancel this order"
        className="mt-3 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-3 py-2 text-sm"
      />
      <button
        type="button"
        disabled={saving}
        onClick={() => void submit()}
        className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-terracotta)] px-4 py-2 text-sm font-medium text-[var(--color-terracotta)] transition hover:bg-[var(--color-terracotta)] hover:text-white disabled:opacity-50"
      >
        {saving ? "Submitting…" : requiresReview ? "Request cancellation review" : "Cancel order"}
      </button>
      {error && <p className="mt-3 text-xs text-[var(--color-terracotta)]">{error}</p>}
      {message && <p className="mt-3 text-xs text-[var(--color-success)]">{message}</p>}
    </section>
  );
}

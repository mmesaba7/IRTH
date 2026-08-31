"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ReturnItemContext = {
  orderItemId: string;
  productSlug: string;
  productNameAr: string | null;
  productNameEn: string;
  orderedQuantity: number;
  alreadyRequestedQuantity: number;
  remainingReturnableQuantity: number;
  deliveredAt: string | null;
  returnWindowDays: number | null;
  returnWindowEndsAt: string | null;
  returnWindowOpen: boolean;
};

type PreviousRequest = {
  id: string;
  status: string;
  submittedAt: string;
  reviewNote: string | null;
  receivedAt: string | null;
  inspectedAt: string | null;
  inspectionNote: string | null;
  items: Array<{
    id: string;
    orderItemId: string;
    productNameAr: string | null;
    productNameEn: string;
    quantity: number;
    reason: string;
    restockableQuantity: number | null;
  }>;
  refund: null | {
    id: string;
    status: string;
    merchandiseAmount: string | number;
    shippingAmount: string | number;
    totalAmount: string | number;
    currencyCode: string;
    preparedAt: string;
    succeededAt: string | null;
  };
};

type ReturnContext = {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  currencyCode: string;
  items: ReturnItemContext[];
  requests: PreviousRequest[];
};

type Draft = { selected: boolean; quantity: number; reason: string };

export default function ReturnRequestPanel({
  orderId,
  guestToken = null,
}: {
  orderId: string;
  guestToken?: string | null;
}) {
  const [context, setContext] = useState<ReturnContext | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
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
        response = await fetch("/api/returns/guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          referrerPolicy: "no-referrer",
          body: JSON.stringify({ action: "context", orderId, token: guestToken }),
        });
      } else {
        const query = new URLSearchParams({ orderId });
        response = await fetch(`/api/returns/customer?${query.toString()}`, { cache: "no-store" });
      }
      const body = await response.json();
      if (!response.ok || !body?.context) throw new Error(body?.error || "Unable to load return options.");
      const next = body.context as ReturnContext;
      setContext(next);
      setDrafts((current) => {
        const updated: Record<string, Draft> = {};
        for (const item of next.items) {
          updated[item.orderItemId] = current[item.orderItemId] ?? { selected: false, quantity: 1, reason: "" };
        }
        return updated;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load return options.");
    } finally {
      setLoading(false);
    }
  }, [guestToken, orderId]);

  useEffect(() => { void load(); }, [load]);

  const eligibleItems = useMemo(
    () => context?.items.filter((item) => item.returnWindowOpen && item.remainingReturnableQuantity > 0) ?? [],
    [context]
  );

  async function submit() {
    if (!context || saving) return;
    const items = eligibleItems
      .filter((item) => drafts[item.orderItemId]?.selected)
      .map((item) => ({
        orderItemId: item.orderItemId,
        quantity: drafts[item.orderItemId]?.quantity ?? 1,
        reason: drafts[item.orderItemId]?.reason.trim() ?? "",
      }));

    if (items.length === 0) {
      setError("Select at least one item to return.");
      return;
    }
    if (items.some((item) => item.reason.length < 3)) {
      setError("Write a short reason for every selected item.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(guestToken ? "/api/returns/guest" : "/api/returns/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        referrerPolicy: "no-referrer",
        body: JSON.stringify(
          guestToken
            ? { action: "create", orderId, token: guestToken, items }
            : { orderId, items }
        ),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to submit return request.");
      setMessage("تم استلام طلب الإرجاع لدى IRTH للمراجعة. لا يتم تنفيذ Refund تلقائيًا عند إرسال الطلب.");
      setDrafts({});
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit return request.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 text-sm text-[var(--text-secondary)]">Loading return options…</section>;
  }

  if (!context) {
    return <section className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error || "Return options are unavailable."}</section>;
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-7">
      <div className="border-b border-[var(--border-soft)] pb-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-copper)]">Returns</p>
        <h2 className="mt-1 font-[var(--font-display)] text-3xl text-[var(--color-espresso)]">Return request · {context.orderNumber}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Return requests are reviewed by IRTH. The approved return window is snapshotted when each shipment is delivered. Return-shipping cost responsibility has not been finalized yet, so this page does not make a shipping-cost promise.
        </p>
      </div>

      {message && <div className="mt-5 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}
      {error && <div className="mt-5 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="mt-6 space-y-4">
        {context.items.map((item) => {
          const draft = drafts[item.orderItemId] ?? { selected: false, quantity: 1, reason: "" };
          const eligible = item.returnWindowOpen && item.remainingReturnableQuantity > 0;
          return (
            <article key={item.orderItemId} className={`rounded-[var(--radius-md)] border p-4 ${eligible ? "border-[var(--border-soft)]" : "border-[var(--border-soft)] bg-[var(--surface-muted)] opacity-70"}`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={draft.selected}
                  disabled={!eligible}
                  onChange={(event) => setDrafts((current) => ({ ...current, [item.orderItemId]: { ...draft, selected: event.target.checked } }))}
                  className="mt-1 h-4 w-4"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--color-espresso)]">{item.productNameAr || item.productNameEn}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Ordered {item.orderedQuantity} · Already requested {item.alreadyRequestedQuantity} · Remaining {item.remainingReturnableQuantity}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {item.deliveredAt ? `Delivered ${new Date(item.deliveredAt).toLocaleDateString("en-GB")}` : "Not delivered"}
                    {item.returnWindowEndsAt ? ` · Return window ends ${new Date(item.returnWindowEndsAt).toLocaleString("en-GB")}` : ""}
                  </p>
                  {!item.returnWindowOpen && <p className="mt-2 text-xs font-medium text-[var(--color-terracotta)]">Return request is not currently available for this item.</p>}

                  {eligible && draft.selected && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-[130px_1fr]">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Quantity</label>
                        <input type="number" min={1} max={item.remainingReturnableQuantity} value={draft.quantity} onChange={(event) => setDrafts((current) => ({ ...current, [item.orderItemId]: { ...draft, quantity: Math.max(1, Math.min(item.remainingReturnableQuantity, Number(event.target.value) || 1)) } }))} className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Reason</label>
                        <input maxLength={1000} value={draft.reason} onChange={(event) => setDrafts((current) => ({ ...current, [item.orderItemId]: { ...draft, reason: event.target.value } }))} placeholder="Tell IRTH why you want to return this item" className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-3 py-2 text-sm" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {eligibleItems.length > 0 ? (
        <button type="button" disabled={saving} onClick={() => void submit()} className="mt-6 w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-5 py-3 text-sm font-medium text-[var(--color-ivory)] hover:bg-[var(--color-copper)] disabled:opacity-50">
          {saving ? "Submitting…" : "Submit return request to IRTH"}
        </button>
      ) : (
        <div className="mt-6 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">There are no items currently available for a new return request.</div>
      )}

      {context.requests.length > 0 && (
        <div className="mt-9 border-t border-[var(--border-soft)] pt-6">
          <h3 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Previous return requests</h3>
          <div className="mt-4 space-y-4">
            {context.requests.map((request) => (
              <article key={request.id} className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[var(--color-espresso)]">Status: {request.status.replaceAll("_", " ")}</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(request.submittedAt).toLocaleString("en-GB")}</p>
                </div>
                <div className="mt-3 space-y-1 text-[var(--text-secondary)]">
                  {request.items.map((item) => <p key={item.id}>{item.productNameAr || item.productNameEn} · Qty {item.quantity} · {item.reason}</p>)}
                </div>
                {request.reviewNote && <p className="mt-3 text-xs text-[var(--text-muted)]">IRTH note: {request.reviewNote}</p>}
                {request.refund && (
                  <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] p-3">
                    <p>Refund: <strong>{request.refund.status}</strong> · {request.refund.currencyCode} {request.refund.totalAmount}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Shipping refund currently recorded: {request.refund.currencyCode} {request.refund.shippingAmount}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

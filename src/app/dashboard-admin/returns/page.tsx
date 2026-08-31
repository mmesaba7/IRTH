"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ReturnItem = {
  returnItemId: string;
  orderItemId: string;
  productNameAr: string | null;
  productNameEn: string;
  quantity: number;
  reason: string;
  restockableQuantity: number | null;
};

type ReturnRequest = {
  id: string;
  orderId: string;
  orderNumber: string;
  requesterKind: string;
  status: string;
  submittedAt: string;
  reviewNote: string | null;
  receivedAt: string | null;
  inspectedAt: string | null;
  inspectionNote: string | null;
  items: ReturnItem[];
  refund: null | {
    id: string;
    status: string;
    merchandiseAmount: string | number;
    shippingAmount: string | number;
    totalAmount: string | number;
    currencyCode: string;
    preparedAt: string;
    succeededAt: string | null;
    providerCode: string | null;
    providerReference: string | null;
  };
};

export default function AdminReturnsPage() {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [inspection, setInspection] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/returns", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to load return requests.");
      const rows = Array.isArray(body?.requests) ? body.requests as ReturnRequest[] : [];
      setRequests(rows);
      setInspection((current) => {
        const next = { ...current };
        for (const request of rows) {
          if (!next[request.id]) {
            next[request.id] = Object.fromEntries(request.items.map((item) => [item.returnItemId, item.restockableQuantity ?? item.quantity]));
          }
        }
        return next;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load return requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function act(request: ReturnRequest, action: "approve" | "reject" | "received" | "inspect" | "prepare_refund") {
    if (working) return;
    setWorking(`${request.id}:${action}`);
    setError("");
    setMessage("");
    try {
      const body: Record<string, unknown> = {
        returnRequestId: request.id,
        action,
        note: notes[request.id]?.trim() || null,
      };
      if (action === "inspect") {
        body.items = request.items.map((item) => ({
          returnItemId: item.returnItemId,
          restockableQuantity: inspection[request.id]?.[item.returnItemId] ?? item.quantity,
        }));
      }
      const response = await fetch("/api/admin/returns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Unable to update return request.");
      setMessage(action === "prepare_refund" ? "Refund record prepared with shipping refund = 0. Actual refund success still belongs to the Payment layer." : "Return request updated.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update return request.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-20 text-[var(--text-primary)]">
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Admin Panel</p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Returns & Refunds</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">Review customer return requests, record physical receipt and inspection, then prepare a trusted refund. Refund success is not faked from this page.</p>
          </div>
          <Link href="/dashboard-admin/dashboard" className="self-start rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)]">← Dashboard</Link>
        </div>

        {message && <div className="mt-5 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-5 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {loading ? (
          <p className="mt-10 text-sm text-[var(--text-secondary)]">Loading return requests…</p>
        ) : requests.length === 0 ? (
          <div className="mt-10 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-8 text-sm text-[var(--text-secondary)]">No return requests yet.</div>
        ) : (
          <div className="mt-8 space-y-6">
            {requests.map((request) => (
              <article key={request.id} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-[var(--color-espresso)]">{request.orderNumber}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{request.requesterKind.replaceAll("_", " ")} · submitted {new Date(request.submittedAt).toLocaleString("en-GB")}</p>
                  </div>
                  <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium capitalize text-[var(--color-copper)]">{request.status.replaceAll("_", " ")}</span>
                </div>

                <div className="mt-5 space-y-3">
                  {request.items.map((item) => (
                    <div key={item.returnItemId} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] p-4 text-sm">
                      <p className="font-medium text-[var(--color-espresso)]">{item.productNameAr || item.productNameEn} · Qty {item.quantity}</p>
                      <p className="mt-2 text-[var(--text-secondary)]">Reason: {item.reason}</p>
                      {request.status === "received" && (
                        <div className="mt-3 flex items-center gap-3">
                          <label className="text-xs text-[var(--text-muted)]">Restockable quantity</label>
                          <input type="number" min={0} max={item.quantity} value={inspection[request.id]?.[item.returnItemId] ?? item.quantity} onChange={(event) => setInspection((current) => ({ ...current, [request.id]: { ...(current[request.id] ?? {}), [item.returnItemId]: Math.max(0, Math.min(item.quantity, Number(event.target.value) || 0)) } }))} className="w-24 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-3 py-2 text-sm" />
                        </div>
                      )}
                      {item.restockableQuantity !== null && request.status !== "received" && <p className="mt-2 text-xs text-[var(--text-muted)]">Inspected restockable: {item.restockableQuantity}</p>}
                    </div>
                  ))}
                </div>

                {request.refund && (
                  <div className="mt-5 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-sm">
                    <p className="font-medium text-[var(--color-espresso)]">Refund: {request.refund.status}</p>
                    <p className="mt-1 text-[var(--text-secondary)]">Merchandise {request.refund.currencyCode} {request.refund.merchandiseAmount} · Shipping {request.refund.currencyCode} {request.refund.shippingAmount} · Total {request.refund.currencyCode} {request.refund.totalAmount}</p>
                    {request.refund.status === "pending" && <p className="mt-2 text-xs text-[var(--text-muted)]">Prepared only. Money is not described as refunded until the Payment layer records success.</p>}
                  </div>
                )}

                {["requested", "received"].includes(request.status) && (
                  <div className="mt-5">
                    <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Admin note (optional)</label>
                    <textarea rows={3} maxLength={2000} value={notes[request.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-3 py-2 text-sm" />
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3 border-t border-[var(--border-soft)] pt-4">
                  {request.status === "requested" && <>
                    <button disabled={Boolean(working)} onClick={() => void act(request, "approve")} className="rounded-[var(--radius-md)] bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50">Approve</button>
                    <button disabled={Boolean(working)} onClick={() => void act(request, "reject")} className="rounded-[var(--radius-md)] bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50">Reject</button>
                  </>}
                  {request.status === "approved" && <button disabled={Boolean(working)} onClick={() => void act(request, "received")} className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-4 py-2 text-sm text-[var(--color-ivory)] disabled:opacity-50">Mark return received</button>}
                  {request.status === "received" && <button disabled={Boolean(working)} onClick={() => void act(request, "inspect")} className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-4 py-2 text-sm text-[var(--color-ivory)] disabled:opacity-50">Save inspection</button>}
                  {request.status === "inspected" && <button disabled={Boolean(working)} onClick={() => void act(request, "prepare_refund")} className="rounded-[var(--radius-md)] bg-[var(--color-copper)] px-4 py-2 text-sm text-white disabled:opacity-50">Prepare refund</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

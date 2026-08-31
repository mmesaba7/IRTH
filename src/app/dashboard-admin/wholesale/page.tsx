"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";

type WholesaleRequest = {
  id: string;
  source_type: string;
  requester_name: string;
  company_name: string | null;
  country_name: string;
  contact_details: string;
  requested_product_or_craft: string;
  quantity: number;
  destination: string | null;
  notes: string | null;
  is_closed: boolean;
  admin_note: string | null;
  created_at: string;
  closed_at: string | null;
};

export default function AdminWholesalePage() {
  const [requests, setRequests] = useState<WholesaleRequest[]>([]);
  const [includeClosed, setIncludeClosed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/wholesale?includeClosed=${includeClosed}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to load wholesale requests.");
      const rows = Array.isArray(body?.requests) ? body.requests as WholesaleRequest[] : [];
      setRequests(rows);
      setNotes(Object.fromEntries(rows.map((item) => [item.id, item.admin_note ?? ""])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load wholesale requests.");
    } finally {
      setLoading(false);
    }
  }, [includeClosed]);

  useEffect(() => { void load(); }, [load]);

  async function setClosed(item: WholesaleRequest, closed: boolean) {
    if (working) return;
    setWorking(item.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/wholesale", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: item.id, closed, adminNote: notes[item.id] ?? "" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to update wholesale request.");
      setMessage(closed ? "Wholesale request closed." : "Wholesale request reopened.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update wholesale request.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-5xl px-6 py-10 md:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Admin Panel</p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Wholesale Requests</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Customer contact details are IRTH-only. Do not forward them to an Artisan.</p>
          </div>
          <Link href="/dashboard-admin/dashboard" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)]">← Dashboard</Link>
        </div>

        <label className="mt-6 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={includeClosed} onChange={(event) => setIncludeClosed(event.target.checked)} />
          Show closed requests
        </label>

        {message && <div className="mt-5 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-5 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {loading ? (
          <p className="mt-10 text-[var(--text-secondary)]">Loading wholesale requests…</p>
        ) : requests.length === 0 ? (
          <div className="mt-10 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-8 text-center text-[var(--text-secondary)]">No wholesale requests in this view.</div>
        ) : (
          <div className="mt-8 space-y-5">
            {requests.map((item) => (
              <article key={item.id} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-olive)]">{item.source_type} wholesale · {item.is_closed ? "closed" : "open"}</p>
                    <h2 className="mt-2 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">{item.requested_product_or_craft}</h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">Quantity: {item.quantity} · Country: {item.country_name}{item.destination ? ` · Destination: ${item.destination}` : ""}</p>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(item.created_at).toLocaleString("en-GB")}</p>
                </div>

                <div className="mt-5 grid gap-4 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-sm sm:grid-cols-2">
                  <div><p className="text-xs text-[var(--text-muted)]">Requester</p><p className="mt-1 text-[var(--color-espresso)]">{item.requester_name}{item.company_name ? ` · ${item.company_name}` : ""}</p></div>
                  <div><p className="text-xs text-[var(--text-muted)]">Contact — IRTH only</p><p className="mt-1 break-words text-[var(--color-espresso)]">{item.contact_details}</p></div>
                </div>
                {item.notes && <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{item.notes}</p>}

                <div className="mt-5 border-t border-[var(--border-soft)] pt-4">
                  <label className="mb-2 block text-xs font-medium text-[var(--text-muted)]">Internal IRTH note</label>
                  <textarea value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={4000} rows={3} className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]" />
                  <button type="button" disabled={Boolean(working)} onClick={() => void setClosed(item, !item.is_closed)} className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-5 py-2 text-sm text-[var(--color-ivory)] disabled:opacity-50">
                    {working === item.id ? "Saving…" : item.is_closed ? "Reopen request" : "Save note & close"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CustomerOrder = {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  currencyCode: string;
  finalTotal: string;
  createdAt: string;
};

type SupportNote = {
  id: string;
  note: string;
  createdAt: string;
  createdByUserId: string;
};

type StatusEvent = {
  isSuspended: boolean;
  reason: string | null;
  changedByUserId: string;
  createdAt: string;
};

type Customer = {
  userId: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  isSuspended: boolean;
  suspensionReason: string | null;
  suspendedAt: string | null;
  orders: CustomerOrder[];
  supportNotes: SupportNote[];
  statusHistory: StatusEvent[];
};

type CustomerResponse = { customers?: Customer[]; error?: string };

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(value));
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [busyCustomerId, setBusyCustomerId] = useState<string | null>(null);
  const [suspensionReasons, setSuspensionReasons] = useState<Record<string, string>>({});
  const [supportNotes, setSupportNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/customers", { cache: "no-store" });
      const body = (await response.json()) as CustomerResponse;
      if (!response.ok) throw new Error(body.error ?? "Unable to load customers.");
      setCustomers(body.customers ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) =>
      (customer.email ?? "").toLowerCase().includes(q) ||
      customer.orders.some((order) => order.orderNumber.toLowerCase().includes(q))
    );
  }, [customers, search]);

  const mutate = async (customerUserId: string, body: Record<string, unknown>, successMessage: string) => {
    if (busyCustomerId) return;
    setBusyCustomerId(customerUserId);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ customerUserId, ...body }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to update customer.");
      setMessage(successMessage);
      await load();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to update customer.");
    } finally {
      setBusyCustomerId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] pb-20">
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Super Admin</p>
            <h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">Customers</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              View customer accounts and orders, suspend or restore login access, and keep internal support notes. Email, phone, password and profile/login details are read-only in IRTH Admin.
            </p>
          </div>
          <Link href="/dashboard-admin/dashboard" className="w-fit rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]">← Dashboard</Link>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by email or order number" className="w-full max-w-xl rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]" />
          <p className="text-sm text-[var(--text-muted)]">{filtered.length} customer account{filtered.length === 1 ? "" : "s"}</p>
        </div>

        {message && <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-olive)] bg-[var(--surface)] p-4 text-sm text-[var(--color-olive)]">{message}</div>}
        {error && <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-terracotta)] bg-[var(--surface)] p-4 text-sm text-[var(--color-terracotta)]">{error}</div>}

        {loading ? (
          <div className="mt-10 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center text-sm text-[var(--text-secondary)]">Loading customer accounts…</div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center text-sm text-[var(--text-secondary)]">No matching customer accounts.</div>
        ) : (
          <div className="mt-8 space-y-5">
            {filtered.map((customer) => {
              const busy = busyCustomerId === customer.userId;
              return (
                <details key={customer.userId} className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
                  <summary className="cursor-pointer list-none p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="break-all font-medium text-[var(--color-espresso)]">{customer.email ?? "Customer account"}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">Created {formatDate(customer.createdAt)} · Last sign in {formatDate(customer.lastSignInAt)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${customer.isSuspended ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{customer.isSuspended ? "Suspended" : "Active"}</span>
                        <span className="text-sm text-[var(--text-secondary)]">{customer.orders.length} orders</span>
                      </div>
                    </div>
                  </summary>

                  <div className="grid gap-7 border-t border-[var(--border-soft)] p-6 lg:grid-cols-2">
                    <section>
                      <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">Account access</h2>
                      {customer.isSuspended ? (
                        <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4">
                          <p className="text-sm font-medium text-[var(--color-terracotta)]">Login suspended</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{customer.suspensionReason ?? "—"}</p>
                          <p className="mt-2 text-xs text-[var(--text-muted)]">Since {formatDate(customer.suspendedAt)}</p>
                          <button type="button" disabled={busy} onClick={() => void mutate(customer.userId, { action: "unsuspend" }, "Customer login restored and audited.")} className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-olive)] px-4 py-2 text-sm font-medium text-[var(--color-olive)] disabled:opacity-50">{busy ? "Working…" : "Unsuspend account"}</button>
                        </div>
                      ) : (
                        <div className="mt-4">
                          <label className="text-sm text-[var(--text-secondary)]">Suspension reason *
                            <textarea value={suspensionReasons[customer.userId] ?? ""} onChange={(event) => setSuspensionReasons((current) => ({ ...current, [customer.userId]: event.target.value.slice(0, 1000) }))} maxLength={1000} rows={3} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]" />
                          </label>
                          <button type="button" disabled={busy || !(suspensionReasons[customer.userId] ?? "").trim()} onClick={() => void mutate(customer.userId, { action: "suspend", reason: suspensionReasons[customer.userId] }, "Customer login suspended and audited.")} className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-terracotta)] px-4 py-2 text-sm font-medium text-[var(--color-terracotta)] disabled:opacity-40">{busy ? "Working…" : "Suspend account"}</button>
                        </div>
                      )}

                      <div className="mt-7 border-t border-[var(--border-soft)] pt-6">
                        <h3 className="font-medium text-[var(--color-espresso)]">Access history</h3>
                        {customer.statusHistory.length === 0 ? <p className="mt-3 text-sm text-[var(--text-muted)]">No suspension history.</p> : (
                          <div className="mt-3 space-y-3">
                            {customer.statusHistory.map((event, index) => (
                              <div key={`${event.createdAt}-${index}`} className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3 text-sm">
                                <p className="font-medium text-[var(--color-espresso)]">{event.isSuspended ? "Suspended" : "Unsuspended"}</p>
                                <p className="mt-1 text-xs text-[var(--text-muted)]">{formatDate(event.createdAt)}</p>
                                {event.reason && <p className="mt-2 whitespace-pre-wrap text-[var(--text-secondary)]">{event.reason}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>

                    <section>
                      <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">Internal support notes</h2>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">Visible to IRTH Super Admin only. Never shown to the customer or artisan.</p>
                      <textarea value={supportNotes[customer.userId] ?? ""} onChange={(event) => setSupportNotes((current) => ({ ...current, [customer.userId]: event.target.value.slice(0, 2000) }))} maxLength={2000} rows={4} placeholder="Add an internal support note…" className="mt-4 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]" />
                      <button type="button" disabled={busy || !(supportNotes[customer.userId] ?? "").trim()} onClick={async () => { await mutate(customer.userId, { action: "support_note", note: supportNotes[customer.userId] }, "Support note saved."); setSupportNotes((current) => ({ ...current, [customer.userId]: "" })); }} className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-4 py-2 text-sm font-medium text-[var(--color-ivory)] disabled:opacity-40">{busy ? "Saving…" : "Add support note"}</button>

                      <div className="mt-5 space-y-3">
                        {customer.supportNotes.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No support notes yet.</p> : customer.supportNotes.map((note) => (
                          <div key={note.id} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] p-3">
                            <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{note.note}</p>
                            <p className="mt-2 text-xs text-[var(--text-muted)]">{formatDate(note.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="lg:col-span-2">
                      <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">Orders</h2>
                      {customer.orders.length === 0 ? <p className="mt-3 text-sm text-[var(--text-muted)]">No orders for this account yet.</p> : (
                        <div className="mt-4 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-soft)]">
                          <table className="min-w-full text-left text-sm">
                            <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Order status</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Created</th></tr></thead>
                            <tbody>{customer.orders.map((order) => <tr key={order.orderId} className="border-t border-[var(--border-soft)]"><td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td><td className="px-4 py-3">{order.currencyCode} {order.finalTotal}</td><td className="px-4 py-3 capitalize">{statusLabel(order.status)}</td><td className="px-4 py-3 capitalize">{statusLabel(order.paymentStatus)}</td><td className="px-4 py-3 text-xs text-[var(--text-muted)]">{formatDate(order.createdAt)}</td></tr>)}</tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

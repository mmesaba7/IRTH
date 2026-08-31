"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AccountRow = {
  id: string;
  artisanId: string;
  artisanName: string;
  artisanSlug: string | null;
  method: string;
  status: string;
  requestedAt: string;
  reviewedAt: string | null;
  activatedAt: string | null;
  reviewNote: string | null;
  accountNumberMasked: string;
  ibanMasked: string | null;
  swift: string | null;
  bankName: string;
  accountHolder: string;
};

type AvailabilityRow = {
  orderItemId: string;
  orderId: string;
  orderNumber: string | null;
  artisanId: string;
  artisanName: string;
  deliveredAt: string | null;
  holdEndsAt: string | null;
  paymentStatus: string;
  currentSettlementAmount: string | number;
  currencyCode: string;
  eligibilityStatus: string;
  payoutAvailabilityStatus: string;
  reservedPayoutBatchId: string | null;
};

type BatchRow = {
  id: string;
  batchNumber: string;
  status: string;
  method: string;
  currencyCode: string;
  totalAmount: string | number;
  itemCount: number;
  createdAt: string;
  paidAt: string | null;
  bankReference: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
};

type BankDetails = {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  iban: string | null;
  swift: string | null;
};

type ReviewDetail = {
  id: string;
  artisanId: string;
  method: string;
  status: string;
  requestedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  bankDetails: BankDetails;
};

type BatchDetail = {
  batch: BatchRow;
  items: Array<{
    id: string;
    orderItemId: string;
    orderId: string | null;
    orderNumber: string | null;
    artisanId: string;
    artisanName: string;
    payoutAccountId: string;
    amount: string | number;
    currencyCode: string;
    status: string;
    bankDetails: BankDetails;
  }>;
};

function money(value: string | number, currency: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${value} ${currency}`;
  try {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency,
      maximumFractionDigits: 6,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function dateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ar-EG");
}

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `payout-ui:${crypto.randomUUID()}`;
  }
  return `payout-ui:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export default function AdminPayoutsPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [reviewDetail, setReviewDetail] = useState<ReviewDetail | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [batchDetail, setBatchDetail] = useState<BatchDetail | null>(null);
  const [bankReference, setBankReference] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const clearSensitiveState = useCallback(() => {
    setReviewDetail(null);
    setReviewNote("");
    setBatchDetail(null);
    setBankReference("");
    setCancelReason("");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    clearSensitiveState();
    try {
      const response = await fetch("/api/admin/payouts", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to load payouts");
      setAccounts(Array.isArray(body?.accounts) ? body.accounts : []);
      setAvailability(Array.isArray(body?.availability) ? body.availability : []);
      setBatches(Array.isArray(body?.batches) ? body.batches : []);
      setSelected([]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load payouts");
    } finally {
      setLoading(false);
    }
  }, [clearSensitiveState]);

  useEffect(() => {
    void load();
    return () => clearSensitiveState();
  }, [load, clearSensitiveState]);

  const pendingAccounts = useMemo(
    () => accounts.filter((account) => account.status === "pending_verification"),
    [accounts]
  );
  const eligible = useMemo(
    () =>
      availability.filter(
        (item) => item.payoutAvailabilityStatus === "eligible"
      ),
    [availability]
  );
  const selectedRows = eligible.filter((item) => selected.includes(item.orderItemId));
  const selectedCurrencies = new Set(selectedRows.map((item) => item.currencyCode));

  function toggleSelection(item: AvailabilityRow) {
    setSelected((current) =>
      current.includes(item.orderItemId)
        ? current.filter((id) => id !== item.orderItemId)
        : [...current, item.orderItemId]
    );
  }

  async function openAccount(accountId: string) {
    setWorking(true);
    setError("");
    clearSensitiveState();
    try {
      const response = await fetch(`/api/admin/payout-accounts/${accountId}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to load payout details");
      setReviewDetail(body.payoutAccount);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "Unable to load payout details");
    } finally {
      setWorking(false);
    }
  }

  async function reviewAccount(decision: "approved" | "rejected") {
    if (!reviewDetail || working) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/payout-accounts/${reviewDetail.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ decision, reviewNote: reviewNote || null }),
        }
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to review payout details");
      clearSensitiveState();
      setMessage(decision === "approved" ? "تم اعتماد بيانات الصرف." : "تم رفض بيانات الصرف.");
      await load();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to review payout details");
    } finally {
      setWorking(false);
    }
  }

  async function createBatch() {
    if (selected.length === 0 || working) return;
    if (selectedCurrencies.size !== 1) {
      setError("اختار عناصر من عملة واحدة فقط لكل دفعة صرف.");
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/payout-batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": makeIdempotencyKey(),
        },
        body: JSON.stringify({ orderItemIds: selected }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to create payout batch");
      setMessage(`تم إنشاء دفعة الصرف ${body.batch.batchNumber}.`);
      await load();
    } catch (batchError) {
      setError(batchError instanceof Error ? batchError.message : "Unable to create payout batch");
    } finally {
      setWorking(false);
    }
  }

  async function openBatch(batchId: string) {
    setWorking(true);
    setError("");
    clearSensitiveState();
    try {
      const response = await fetch(`/api/admin/payout-batches/${batchId}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to load payout batch");
      setBatchDetail(body as BatchDetail);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "Unable to load payout batch");
    } finally {
      setWorking(false);
    }
  }

  async function updateBatch(action: "paid" | "cancel") {
    if (!batchDetail || working) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const payload =
        action === "paid"
          ? { action: "paid", bankReference }
          : { action: "cancel", reason: cancelReason };
      const response = await fetch(
        `/api/admin/payout-batches/${batchDetail.batch.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to update payout batch");
      clearSensitiveState();
      setMessage(action === "paid" ? "تم تسجيل التحويل البنكي كمدفوع." : "تم إلغاء دفعة الصرف وتحرير المستحقات.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update payout batch");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10">
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Admin Panel</p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Payouts</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">مراجعة بيانات الصرف وإنشاء وتسجيل دفعات التحويل البنكي يدويًا.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => void load()} disabled={loading || working} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm disabled:opacity-50">تحديث</button>
            <Link href="/dashboard-admin/dashboard" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm">رجوع</Link>
          </div>
        </div>

        <div className="mt-6 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          بيانات البنك الكاملة لا تظهر في القوائم. يتم فك تشفيرها على السيرفر فقط عند فتح مراجعة أو تفاصيل دفعة، وتظل في ذاكرة الصفحة مؤقتًا حتى الإغلاق أو تنفيذ الإجراء.
        </div>

        {message && <div className="mt-4 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-4 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="flex h-64 items-center justify-center text-[var(--text-secondary)]">جاري تحميل بيانات الصرف...</div>
        ) : (
          <div className="mt-10 space-y-14">
            <section>
              <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">بيانات صرف تحتاج مراجعة</h2>
              <div className="mt-4 space-y-3">
                {pendingAccounts.length === 0 ? (
                  <Empty text="لا توجد طلبات بيانات صرف قيد المراجعة." />
                ) : pendingAccounts.map((account) => (
                  <div key={account.id} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <p className="font-semibold text-[var(--color-espresso)]">{account.artisanName}</p>
                        <p className="text-sm text-[var(--text-secondary)]">{account.bankName} — {account.accountHolder}</p>
                        <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">Account: {account.accountNumberMasked}{account.ibanMasked ? ` · IBAN: ${account.ibanMasked}` : ""}</p>
                        <p className="text-xs text-[var(--text-muted)]">Submitted: {dateTime(account.requestedAt)}</p>
                      </div>
                      <button onClick={() => void openAccount(account.id)} disabled={working} className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-4 py-2 text-sm text-[var(--color-ivory)] disabled:opacity-50">مراجعة آمنة</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">المستحقات المتاحة للصرف</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">الـDatabase ستعيد التحقق من الاستحقاق والمبلغ قبل إنشاء الدفعة.</p>
                </div>
                <button onClick={() => void createBatch()} disabled={selected.length === 0 || working} className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-5 py-3 text-sm text-[var(--color-ivory)] disabled:opacity-50">إنشاء دفعة من المحدد ({selected.length})</button>
              </div>
              <div className="mt-4 space-y-3">
                {eligible.length === 0 ? <Empty text="لا توجد مستحقات Eligible حاليًا." /> : eligible.map((item) => (
                  <label key={item.orderItemId} className="flex cursor-pointer gap-4 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
                    <input type="checkbox" checked={selected.includes(item.orderItemId)} onChange={() => toggleSelection(item)} className="mt-1 h-4 w-4" />
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 sm:flex-row">
                      <div>
                        <p className="font-medium text-[var(--color-espresso)]">{item.artisanName}</p>
                        <p className="text-sm text-[var(--text-secondary)]">Order {item.orderNumber ?? item.orderId}</p>
                        <p className="text-xs text-[var(--text-muted)]">Eligible after: {dateTime(item.holdEndsAt)}</p>
                      </div>
                      <p className="font-semibold text-[var(--color-olive)]">{money(item.currentSettlementAmount, item.currencyCode)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">دفعات الصرف</h2>
              <div className="mt-4 space-y-3">
                {batches.length === 0 ? <Empty text="لم يتم إنشاء دفعات صرف بعد." /> : batches.map((batch) => (
                  <div key={batch.id} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <p className="font-mono text-sm font-semibold text-[var(--color-espresso)]">{batch.batchNumber}</p>
                        <p className="text-xs text-[var(--text-muted)]">{batch.itemCount} items · {dateTime(batch.createdAt)}</p>
                        <p className="text-xs text-[var(--text-secondary)]">Status: {batch.status}</p>
                      </div>
                      <div className="sm:text-end">
                        <p className="font-semibold">{money(batch.totalAmount, batch.currencyCode)}</p>
                        <button onClick={() => void openBatch(batch.id)} disabled={working} className="mt-2 rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm disabled:opacity-50">فتح التفاصيل</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>

      {reviewDetail && (
        <SensitiveOverlay title="مراجعة بيانات الصرف" onClose={clearSensitiveState}>
          <BankDetailsView details={reviewDetail.bankDetails} />
          <label className="mt-5 block text-sm font-medium">ملاحظة المراجعة — اختياري</label>
          <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={2000} className="mt-2 min-h-24 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] p-3" />
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => void reviewAccount("approved")} disabled={working} className="flex-1 rounded-[var(--radius-md)] bg-green-700 px-4 py-3 text-sm text-white disabled:opacity-50">Approve</button>
            <button onClick={() => void reviewAccount("rejected")} disabled={working} className="flex-1 rounded-[var(--radius-md)] bg-red-700 px-4 py-3 text-sm text-white disabled:opacity-50">Reject</button>
          </div>
        </SensitiveOverlay>
      )}

      {batchDetail && (
        <SensitiveOverlay title={`دفعة ${batchDetail.batch.batchNumber}`} onClose={clearSensitiveState}>
          <p className="mb-5 text-sm text-[var(--text-secondary)]">{money(batchDetail.batch.totalAmount, batchDetail.batch.currencyCode)} · {batchDetail.batch.status}</p>
          <div className="space-y-5">
            {batchDetail.items.map((item) => (
              <div key={item.id} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] p-4">
                <p className="font-semibold">{item.artisanName} — {money(item.amount, item.currencyCode)}</p>
                <p className="mb-3 text-xs text-[var(--text-muted)]">Order {item.orderNumber ?? item.orderId ?? item.orderItemId}</p>
                <BankDetailsView details={item.bankDetails} compact />
              </div>
            ))}
          </div>

          {batchDetail.batch.status === "pending" && (
            <div className="mt-6 space-y-4 border-t border-[var(--border-soft)] pt-5">
              <div>
                <label className="block text-sm font-medium">Bank transfer reference</label>
                <input value={bankReference} onChange={(event) => setBankReference(event.target.value)} maxLength={200} autoComplete="off" spellCheck={false} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] p-3" />
                <button onClick={() => void updateBatch("paid")} disabled={working || bankReference.trim().length < 3} className="mt-3 w-full rounded-[var(--radius-md)] bg-green-700 px-4 py-3 text-sm text-white disabled:opacity-50">تسجيل التحويل كمدفوع</button>
              </div>
              <div>
                <label className="block text-sm font-medium">سبب إلغاء الدفعة</label>
                <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} maxLength={2000} className="mt-2 min-h-20 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] p-3" />
                <button onClick={() => void updateBatch("cancel")} disabled={working || cancelReason.trim().length < 3} className="mt-3 w-full rounded-[var(--radius-md)] border border-red-300 px-4 py-3 text-sm text-red-700 disabled:opacity-50">إلغاء الدفعة وتحرير المستحقات</button>
              </div>
            </div>
          )}
        </SensitiveOverlay>
      )}
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-6 text-center text-sm text-[var(--text-secondary)]">{text}</div>;
}

function SensitiveOverlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="mx-auto my-8 max-w-3xl rounded-[var(--radius-lg)] bg-[var(--background)] p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border-soft)] pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">Sensitive financial data</p>
            <h3 className="mt-1 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">{title}</h3>
          </div>
          <button onClick={onClose} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-3 py-2 text-sm">إغلاق ومسح البيانات</button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function BankDetailsView({ details, compact = false }: { details: BankDetails; compact?: boolean }) {
  const rows = [
    ["Bank", details.bankName],
    ["Account holder", details.accountHolder],
    ["Account number", details.accountNumber],
    ["IBAN", details.iban || "—"],
    ["SWIFT / BIC", details.swift || "—"],
  ];
  return (
    <dl className={compact ? "grid gap-2 text-sm sm:grid-cols-2" : "space-y-3"}>
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
          <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
          <dd className="mt-1 break-all font-mono text-sm text-[var(--color-espresso)]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

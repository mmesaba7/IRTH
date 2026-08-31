"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "../../components/Header";
import Link from "next/link";

type CurrencySummary = {
  currencyCode: string;
  currentOutstandingAmount: string | number;
  availableForPayoutAmount: string | number;
  reservedForPayoutAmount: string | number;
  paidAmount: string | number;
};

type EarningRow = {
  orderItemId: string;
  orderId: string;
  orderNumber: string | null;
  deliveredAt: string | null;
  holdEndsAt: string | null;
  paymentStatus: string;
  currentSettlementAmount: string | number;
  currencyCode: string;
  eligibilityStatus: string;
  payoutAvailabilityStatus: string;
  eligibleAt: string | null;
  latestPayoutBatchNumber: string | null;
  latestPayoutItemStatus: string | null;
  latestPayoutAmount: string | number | null;
  latestPayoutPaidAt: string | null;
};

type PayoutRow = {
  batchId: string;
  batchNumber: string;
  status: string;
  currencyCode: string;
  amount: string | number;
  createdAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
};

type PayoutAccountStatus = {
  payout_account_id: string;
  method: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  activated_at: string | null;
  review_note: string | null;
};

type DashboardData = {
  summaryByCurrency: CurrencySummary[];
  earnings: EarningRow[];
  payouts: PayoutRow[];
};

function formatMoney(value: string | number | null | undefined, currency: string) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return `${value ?? "0"} ${currency}`;
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

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ar-EG");
}

function earningStatus(row: EarningRow) {
  if (row.latestPayoutItemStatus === "paid") return "تم الصرف";
  if (row.payoutAvailabilityStatus === "reserved_for_payout") return "داخل دفعة صرف";
  switch (row.eligibilityStatus) {
    case "eligible":
      return "مستحق للصرف";
    case "configuration_missing":
      return "في انتظار إعداد فترة الإرجاع";
    case "not_delivered":
      return "في انتظار التسليم";
    case "payment_not_collected":
      return "في انتظار تحصيل الدفع";
    case "return_open":
      return "متوقف بسبب إرجاع/استرداد";
    case "hold_active":
      return "داخل فترة الإرجاع";
    case "no_positive_balance":
      return "لا يوجد رصيد مستحق";
    default:
      return row.eligibilityStatus || "قيد الانتظار";
  }
}

export default function ArtisanPayoutsPage() {
  const [dashboard, setDashboard] = useState<DashboardData>({
    summaryByCurrency: [],
    earnings: [],
    payouts: [],
  });
  const [accounts, setAccounts] = useState<PayoutAccountStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/artisan/payouts", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || "تعذر تحميل المستحقات");
      }
      setDashboard({
        summaryByCurrency: Array.isArray(body?.dashboard?.summaryByCurrency)
          ? body.dashboard.summaryByCurrency
          : [],
        earnings: Array.isArray(body?.dashboard?.earnings)
          ? body.dashboard.earnings
          : [],
        payouts: Array.isArray(body?.dashboard?.payouts)
          ? body.dashboard.payouts
          : [],
      });
      setAccounts(Array.isArray(body?.payoutAccounts) ? body.payoutAccounts : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل المستحقات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeAccount = accounts.find((account) => account.status === "active");
  const pendingAccount = accounts.find(
    (account) => account.status === "pending_verification"
  );

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Artisan Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl font-normal text-[var(--color-espresso)]">
              المستحقات وعمليات الصرف
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              الأرقام هنا قادمة من الـSettlement Ledger الموثوق، وليست محسوبة في المتصفح.
            </p>
          </div>
          <Link
            href="/artisan/payouts/setting"
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
          >
            إعدادات الصرف
          </Link>
        </div>

        <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] p-4 text-sm">
          {pendingAccount ? (
            <span className="text-amber-700">بيانات الصرف قيد مراجعة IRTH.</span>
          ) : activeAccount ? (
            <span className="text-green-700">بيانات الصرف معتمدة ونشطة.</span>
          ) : (
            <span className="text-[var(--text-secondary)]">
              لم يتم اعتماد بيانات صرف بعد. أضف بياناتك قبل أول عملية صرف.
            </span>
          )}
        </div>

        {error && (
          <div className="mt-6 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button onClick={() => void load()} className="ms-3 underline">
              إعادة المحاولة
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex h-72 items-center justify-center">
            <p className="text-[var(--text-secondary)]">جاري تحميل المستحقات...</p>
          </div>
        ) : (
          <>
            {dashboard.summaryByCurrency.length === 0 ? (
              <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-8 text-center text-[var(--text-secondary)]">
                لا توجد حركة مالية للحرفي حتى الآن.
              </div>
            ) : (
              <div className="mt-8 space-y-6">
                {dashboard.summaryByCurrency.map((summary) => (
                  <div key={summary.currencyCode}>
                    <p className="mb-3 text-sm font-medium text-[var(--text-secondary)]">
                      العملة: {summary.currencyCode}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <SummaryCard
                        label="الرصيد الحالي"
                        value={formatMoney(summary.currentOutstandingAmount, summary.currencyCode)}
                      />
                      <SummaryCard
                        label="متاح للصرف"
                        value={formatMoney(summary.availableForPayoutAmount, summary.currencyCode)}
                      />
                      <SummaryCard
                        label="داخل دفعة صرف"
                        value={formatMoney(summary.reservedForPayoutAmount, summary.currencyCode)}
                      />
                      <SummaryCard
                        label="تم صرفه"
                        value={formatMoney(summary.paidAmount, summary.currencyCode)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-12">
              <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                تفاصيل المستحقات
              </h2>
              <div className="mt-4 space-y-4">
                {dashboard.earnings.length === 0 ? (
                  <p className="rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-6 text-center text-sm text-[var(--text-secondary)]">
                    لا توجد مستحقات بعد.
                  </p>
                ) : (
                  dashboard.earnings.map((earning) => (
                    <div
                      key={earning.orderItemId}
                      className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row">
                        <div>
                          <p className="font-medium text-[var(--color-espresso)]">
                            الطلب {earning.orderNumber ?? earning.orderId}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            التسليم: {formatDate(earning.deliveredAt)}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            نهاية فترة الإرجاع: {formatDate(earning.holdEndsAt)}
                          </p>
                        </div>
                        <div className="sm:text-end">
                          <p className="font-semibold text-[var(--color-olive)]">
                            {formatMoney(
                              earning.latestPayoutItemStatus === "paid"
                                ? earning.latestPayoutAmount
                                : earning.currentSettlementAmount,
                              earning.currencyCode
                            )}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {earningStatus(earning)}
                          </p>
                        </div>
                      </div>
                      {earning.latestPayoutBatchNumber && (
                        <p className="mt-3 border-t border-[var(--border-soft)] pt-3 text-xs text-[var(--text-muted)]">
                          دفعة الصرف: {earning.latestPayoutBatchNumber}
                          {earning.latestPayoutPaidAt
                            ? ` — ${formatDate(earning.latestPayoutPaidAt)}`
                            : ""}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-12">
              <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                سجل دفعات الصرف
              </h2>
              <div className="mt-4 space-y-3">
                {dashboard.payouts.length === 0 ? (
                  <p className="rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-6 text-center text-sm text-[var(--text-secondary)]">
                    لا توجد دفعات صرف حتى الآن.
                  </p>
                ) : (
                  dashboard.payouts.map((payout) => (
                    <div
                      key={payout.batchId}
                      className="flex flex-col justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="font-mono text-sm text-[var(--color-espresso)]">
                          {payout.batchNumber}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {formatDate(payout.createdAt)}
                        </p>
                      </div>
                      <div className="sm:text-end">
                        <p className="font-semibold">
                          {formatMoney(payout.amount, payout.currencyCode)}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {payout.status === "paid"
                            ? `تم الصرف ${formatDate(payout.paidAt)}`
                            : payout.status === "cancelled"
                            ? "ألغيت الدفعة"
                            : "قيد الصرف"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[var(--color-espresso)]">{value}</p>
    </div>
  );
}

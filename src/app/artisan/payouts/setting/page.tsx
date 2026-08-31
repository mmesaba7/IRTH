"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Header from "../../../components/Header";
import Link from "next/link";

type PayoutAccountStatus = {
  payout_account_id: string;
  method: string;
  status: "pending_verification" | "active" | "rejected" | "superseded";
  requested_at: string;
  reviewed_at: string | null;
  activated_at: string | null;
  review_note: string | null;
};

type FormState = {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  iban: string;
  swift: string;
};

const EMPTY_FORM: FormState = {
  bankName: "",
  accountHolder: "",
  accountNumber: "",
  iban: "",
  swift: "",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ar-EG");
}

export default function PayoutSettingsPage() {
  const [accounts, setAccounts] = useState<PayoutAccountStatus[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/artisan/payout-account", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || "تعذر تحميل حالة بيانات الصرف");
      }
      setAccounts(Array.isArray(body?.payoutAccounts) ? body.payoutAccounts : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر تحميل حالة بيانات الصرف"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const pending = accounts.find(
    (account) => account.status === "pending_verification"
  );
  const active = accounts.find((account) => account.status === "active");
  const latestRejected = accounts.find((account) => account.status === "rejected");

  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/artisan/payout-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || "تعذر إرسال بيانات الصرف");
      }

      // Sensitive values are intentionally removed from browser memory after submit.
      setForm(EMPTY_FORM);
      setMessage(
        body?.payoutAccount?.changed
          ? "تم إرسال بيانات الصرف بشكل مشفّر وهي الآن في انتظار مراجعة IRTH."
          : "هذه البيانات مسجلة بالفعل ولا تحتاج طلبًا جديدًا."
      );
      await loadStatus();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "تعذر إرسال بيانات الصرف"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-10 md:py-16">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Artisan Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl font-normal text-[var(--color-espresso)]">
              إعدادات الصرف
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              بيانات البنك تُشفّر على السيرفر قبل تخزينها، ولا يتم حفظها في Local Storage.
            </p>
          </div>
          <Link
            href="/artisan/payouts"
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
          >
            رجوع للمستحقات
          </Link>
        </div>

        <div className="mt-8 space-y-3">
          {loading ? (
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
              جاري تحميل الحالة...
            </div>
          ) : pending ? (
            <div className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>قيد المراجعة.</strong> تم إرسال آخر تغيير في {formatDate(pending.requested_at)}. لن نسمح بإرسال تغيير آخر قبل انتهاء المراجعة الحالية.
            </div>
          ) : active ? (
            <div className="rounded-[var(--radius-md)] border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <strong>بيانات الصرف معتمدة.</strong> تم التفعيل في {formatDate(active.activated_at)}. لو أرسلت بيانات جديدة ستظل البيانات الحالية نشطة حتى تعتمد IRTH التغيير الجديد.
            </div>
          ) : (
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
              لا توجد بيانات صرف معتمدة حتى الآن.
            </div>
          )}

          {!pending && latestRejected?.review_note && (
            <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              ملاحظة آخر مراجعة: {latestRejected.review_note}
            </div>
          )}

          {message && (
            <div className="rounded-[var(--radius-md)] border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
          <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
            {active ? "طلب تغيير بيانات البنك" : "إضافة بيانات البنك"}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            لأسباب أمنية لا نعرض أو نملأ بيانات البنك القديمة تلقائيًا. عند التغيير اكتب البيانات الجديدة كاملة.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" autoComplete="off">
            <Field
              label="اسم البنك"
              value={form.bankName}
              onChange={(value) => updateField("bankName", value)}
              placeholder="اسم البنك"
              disabled={Boolean(pending) || saving}
            />
            <Field
              label="اسم صاحب الحساب"
              value={form.accountHolder}
              onChange={(value) => updateField("accountHolder", value)}
              placeholder="الاسم كما هو مسجل في البنك"
              disabled={Boolean(pending) || saving}
            />
            <Field
              label="رقم الحساب"
              value={form.accountNumber}
              onChange={(value) => updateField("accountNumber", value)}
              placeholder="رقم الحساب البنكي"
              disabled={Boolean(pending) || saving}
              sensitive
            />
            <Field
              label="IBAN — اختياري"
              value={form.iban}
              onChange={(value) => updateField("iban", value)}
              placeholder="IBAN عند توفره"
              disabled={Boolean(pending) || saving}
              sensitive
              required={false}
            />
            <Field
              label="SWIFT / BIC — اختياري"
              value={form.swift}
              onChange={(value) => updateField("swift", value)}
              placeholder="SWIFT أو BIC عند توفره"
              disabled={Boolean(pending) || saving}
              sensitive
              required={false}
            />

            <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-xs leading-6 text-[var(--text-secondary)]">
              لن يتم تفعيل أي بيانات جديدة فور الإرسال. كل إضافة أو تغيير يظل <strong>Pending Verification</strong> حتى مراجعة IRTH واعتمادها.
            </div>

            <button
              type="submit"
              disabled={Boolean(pending) || saving}
              className="w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "جاري التشفير والإرسال..."
                : pending
                ? "يوجد طلب تغيير قيد المراجعة"
                : active
                ? "إرسال طلب التغيير للمراجعة"
                : "إرسال البيانات للمراجعة"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  sensitive = false,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  sensitive?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete="off"
        autoCapitalize={sensitive ? "none" : undefined}
        spellCheck={false}
        className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)] disabled:bg-[var(--surface-muted)] disabled:opacity-70"
      />
    </div>
  );
}

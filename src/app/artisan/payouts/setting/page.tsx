"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";

type PayoutSettings = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  iban: string;
  swift: string;
  verified: boolean;
};

export default function PayoutSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<PayoutSettings>({
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    iban: "",
    swift: "",
    verified: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {

    const saved = localStorage.getItem("irth-artisan-payout-settings");
    if (saved) {
      setSettings(JSON.parse(saved));
    }
    setLoading(false);
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    // نضيف حالة "قيد المراجعة"
    const updatedSettings = { ...settings, verified: false };
    localStorage.setItem(
      "irth-artisan-payout-settings",
      JSON.stringify(updatedSettings)
    );

    setSaving(false);
    setMessage("✅ تم حفظ البيانات، في انتظار مراجعة إرث");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p>جاري التحميل...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-3xl px-6 py-10 md:py-16">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Artisan Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl font-normal text-[var(--color-espresso)]">
              ⚙️ إعدادات الصرف
            </h1>
            <p className="text-[var(--text-secondary)]">
              بيانات حسابك البنكي لاستلام المستحقات
            </p>
          </div>
        </div>

        {message && (
          <div className="mt-6 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {settings.verified && (
          <div className="mt-6 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">
            ✅ تم التحقق من بيانات الصرف الخاصة بك.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
              اسم البنك
            </label>
            <input
              type="text"
              name="bankName"
              value={settings.bankName}
              onChange={handleChange}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              placeholder="مثال: البنك الأهلي المصري"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
              رقم الحساب
            </label>
            <input
              type="text"
              name="accountNumber"
              value={settings.accountNumber}
              onChange={handleChange}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              placeholder="مثال: 1234567890"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
              اسم صاحب الحساب
            </label>
            <input
              type="text"
              name="accountHolder"
              value={settings.accountHolder}
              onChange={handleChange}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              placeholder="مثال: أحمد حسن"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
              IBAN (اختياري)
            </label>
            <input
              type="text"
              name="iban"
              value={settings.iban}
              onChange={handleChange}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              placeholder="مثال: EG1234567890"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
              SWIFT Code (اختياري)
            </label>
            <input
              type="text"
              name="swift"
              value={settings.swift}
              onChange={handleChange}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              placeholder="مثال: NBEGEGCX"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)] disabled:opacity-50"
            >
              {saving ? "جاري الحفظ..." : "💾 حفظ البيانات"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/artisan/payouts")}
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--border-soft)] px-6 py-4 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
            >
              إلغاء
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}


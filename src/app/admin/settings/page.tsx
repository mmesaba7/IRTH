"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";

export default function AdminSettingsPage() {
  const [commissionRate, setCommissionRate] = useState(15); // نسبة مئوية
  const [returnPeriod, setReturnPeriod] = useState(14); // فترة الإرجاع بالأيام
  const [payoutCycle, setPayoutCycle] = useState("monthly"); // أسبوعي، شهري، ربع سنوي
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("irth-admin-settings");
    if (saved) {
      const data = JSON.parse(saved);
      setCommissionRate(data.commissionRate || 15);
      setReturnPeriod(data.returnPeriod || 14);
      setPayoutCycle(data.payoutCycle || "monthly");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const settings = {
      commissionRate,
      returnPeriod,
      payoutCycle,
    };

    localStorage.setItem("irth-admin-settings", JSON.stringify(settings));
    setSaving(false);
    setMessage("✅ تم حفظ الإعدادات بنجاح");
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-3xl px-6 py-10 md:py-16">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
            Admin Panel
          </p>
          <h1 className="mt-1 font-[var(--font-display)] text-4xl font-normal text-[var(--color-espresso)]">
            ⚙️ إعدادات المستحقات
          </h1>
          <p className="text-[var(--text-secondary)]">
            تحكم في العمولة وفترة الإرجاع ودورة الصرف
          </p>
        </div>

        {message && (
          <div className="mt-6 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
              نسبة عمولة إرث (%)
            </label>
            <input
              type="number"
              value={commissionRate}
              onChange={(e) => setCommissionRate(Number(e.target.value))}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              min="0"
              max="100"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
              فترة الإرجاع (بالأيام)
            </label>
            <input
              type="number"
              value={returnPeriod}
              onChange={(e) => setReturnPeriod(Number(e.target.value))}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              min="0"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
              دورة الصرف
            </label>
            <select
              value={payoutCycle}
              onChange={(e) => setPayoutCycle(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
            >
              <option value="weekly">أسبوعي</option>
              <option value="monthly">شهري</option>
              <option value="quarterly">ربع سنوي</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)] disabled:opacity-50"
          >
            {saving ? "جاري الحفظ..." : "💾 حفظ الإعدادات"}
          </button>
        </form>
      </section>
    </main>
  );
}
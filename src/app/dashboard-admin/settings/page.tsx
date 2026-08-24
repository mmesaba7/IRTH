"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AdminSettings = {
  commissionRate: number;
  returnPeriod: number;
  payoutCycle: "weekly" | "monthly" | "quarterly";
  shippingDefault: number;
  productApproval: "auto" | "manual";
  currency: string;
  notifications: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AdminSettings>({
    commissionRate: 15,
    returnPeriod: 14,
    payoutCycle: "monthly",
    shippingDefault: 30,
    productApproval: "manual",
    currency: "USD",
    notifications: {
      email: true,
      sms: false,
      whatsapp: false,
    },
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAuth = document.cookie.includes("irth-admin-auth=true");
    if (!isAuth) {
      router.push("/dashboard-admin/login");
      return;
    }

    // تحميل الإعدادات المحفوظة
    const saved = localStorage.getItem("irth-admin-settings");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setSettings({
          commissionRate: data.commissionRate || 15,
          returnPeriod: data.returnPeriod || 14,
          payoutCycle: data.payoutCycle || "monthly",
          shippingDefault: data.shippingDefault || 30,
          productApproval: data.productApproval || "manual",
          currency: data.currency || "USD",
          notifications: {
            email: data.notifications?.email ?? true,
            sms: data.notifications?.sms ?? false,
            whatsapp: data.notifications?.whatsapp ?? false,
          },
        });
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    }
    setLoading(false);
  }, [router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      const [parent, child] = name.split(".");
      if (child) {
        setSettings((prev) => ({
          ...prev,
          [parent]: {
            ...(prev[parent as keyof AdminSettings] as any),
            [child]: checked,
          },
        }));
      }
      return;
    }
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    localStorage.setItem("irth-admin-settings", JSON.stringify(settings));
    setSaving(false);
    setMessage("✅ All settings saved successfully");

    setTimeout(() => setMessage(""), 3000);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* رأس الصفحة */}
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Admin Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              ⚙️ Settings
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage platform-wide configurations
            </p>
          </div>
          <Link
            href="/dashboard-admin/dashboard"
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {message && (
          <div className="mt-6 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* مجموعة: المالية */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
              Financial Settings
            </h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  name="commissionRate"
                  value={settings.commissionRate}
                  onChange={handleChange}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                  min="0"
                  max="100"
                  step="0.5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  Return Period (days)
                </label>
                <input
                  type="number"
                  name="returnPeriod"
                  value={settings.returnPeriod}
                  onChange={handleChange}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                  min="0"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  Payout Cycle
                </label>
                <select
                  name="payoutCycle"
                  value={settings.payoutCycle}
                  onChange={handleChange}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  Default Currency
                </label>
                <select
                  name="currency"
                  value={settings.currency}
                  onChange={handleChange}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EGP">EGP (ج.م)</option>
                  <option value="SAR">SAR (ر.س)</option>
                  <option value="AED">AED (د.إ)</option>
                </select>
              </div>
            </div>
          </div>

          {/* مجموعة: الشحن والموافقة */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
              Shipping & Approval
            </h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  Default Shipping Cost ($)
                </label>
                <input
                  type="number"
                  name="shippingDefault"
                  value={settings.shippingDefault}
                  onChange={handleChange}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  Product Approval
                </label>
                <select
                  name="productApproval"
                  value={settings.productApproval}
                  onChange={handleChange}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                >
                  <option value="manual">Manual Review</option>
                  <option value="auto">Auto Approve</option>
                </select>
              </div>
            </div>
          </div>

          {/* مجموعة: الإشعارات */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
              Notification Channels
            </h2>
            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="notifications.email"
                  checked={settings.notifications.email}
                  onChange={handleChange}
                  className="h-4 w-4 accent-[var(--color-copper)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">Email</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="notifications.sms"
                  checked={settings.notifications.sms}
                  onChange={handleChange}
                  className="h-4 w-4 accent-[var(--color-copper)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">SMS</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="notifications.whatsapp"
                  checked={settings.notifications.whatsapp}
                  onChange={handleChange}
                  className="h-4 w-4 accent-[var(--color-copper)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">WhatsApp</span>
              </label>
            </div>
          </div>

          {/* زر الحفظ */}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)] disabled:opacity-50"
          >
            {saving ? "Saving..." : "💾 Save All Settings"}
          </button>
        </form>
      </div>
    </main>
  );
}
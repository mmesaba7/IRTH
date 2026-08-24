"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Country = {
  id: string;
  name: string;
  nameEn: string;
  slug: string;
  currency: string;
  currencySymbol: string;
  shippingCost: number;
  freeShippingThreshold: number;
  status: "active" | "inactive";
  // إحصائيات (تتحديث تلقائياً)
  artisanCount?: number;
  productCount?: number;
  createdAt: string;
  updatedAt?: string;
};

export default function AdminCountriesPage() {
  const router = useRouter();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // نموذج إضافة دولة جديدة
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCountry, setNewCountry] = useState({
    name: "",
    nameEn: "",
    currency: "EGP",
    currencySymbol: "ج.م",
    shippingCost: 50,
    freeShippingThreshold: 500,
  });

  useEffect(() => {
    const isAuth = document.cookie.includes("irth-admin-auth=true");
    if (!isAuth) {
      router.push("/dashboard-admin/login");
      return;
    }
    loadCountries();
  }, [router]);

  const loadCountries = () => {
    const storedCountries: Country[] = JSON.parse(
      localStorage.getItem("irth-countries") || "[]"
    );

    // بيانات افتراضية لو مفيش دول
    if (storedCountries.length === 0) {
      const defaultCountries: Country[] = [
        {
          id: "country-1",
          name: "مصر",
          nameEn: "Egypt",
          slug: "egypt",
          currency: "EGP",
          currencySymbol: "ج.م",
          shippingCost: 50,
          freeShippingThreshold: 500,
          status: "active",
          artisanCount: 3,
          productCount: 5,
          createdAt: new Date().toISOString(),
        },
        {
          id: "country-2",
          name: "المملكة العربية السعودية",
          nameEn: "Saudi Arabia",
          slug: "saudi-arabia",
          currency: "SAR",
          currencySymbol: "ر.س",
          shippingCost: 30,
          freeShippingThreshold: 300,
          status: "active",
          artisanCount: 2,
          productCount: 4,
          createdAt: new Date().toISOString(),
        },
        {
          id: "country-3",
          name: "الإمارات العربية المتحدة",
          nameEn: "UAE",
          slug: "uae",
          currency: "AED",
          currencySymbol: "د.إ",
          shippingCost: 35,
          freeShippingThreshold: 350,
          status: "active",
          artisanCount: 1,
          productCount: 2,
          createdAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem("irth-countries", JSON.stringify(defaultCountries));
      setCountries(defaultCountries);
      setLoading(false);
      return;
    }

    setCountries(storedCountries);
    setLoading(false);
  };

  const handleAddCountry = () => {
    if (!newCountry.name.trim() || !newCountry.nameEn.trim()) {
      setMessage("❌ من فضلك أدخل الاسم بالعربية والإنجليزية");
      return;
    }

    const country: Country = {
      id: `country-${Date.now()}`,
      name: newCountry.name.trim(),
      nameEn: newCountry.nameEn.trim(),
      slug: newCountry.nameEn.trim().toLowerCase().replace(/ /g, "-"),
      currency: newCountry.currency,
      currencySymbol: newCountry.currencySymbol,
      shippingCost: Number(newCountry.shippingCost),
      freeShippingThreshold: Number(newCountry.freeShippingThreshold),
      status: "active",
      artisanCount: 0,
      productCount: 0,
      createdAt: new Date().toISOString(),
    };

    const updated = [...countries, country];
    localStorage.setItem("irth-countries", JSON.stringify(updated));
    setCountries(updated);
    setNewCountry({
      name: "",
      nameEn: "",
      currency: "EGP",
      currencySymbol: "ج.م",
      shippingCost: 50,
      freeShippingThreshold: 500,
    });
    setShowAddForm(false);
    setMessage("✅ تم إضافة الدولة بنجاح");
    setTimeout(() => setMessage(""), 3000);
  };

  const updateCountryField = (
    id: string,
    field: keyof Country,
    value: string | number
  ) => {
    const updated = countries.map((c) =>
      c.id === id
        ? { ...c, [field]: value, updatedAt: new Date().toISOString() }
        : c
    );
    localStorage.setItem("irth-countries", JSON.stringify(updated));
    setCountries(updated);
  };

  const updateCountryStatus = (id: string, status: "active" | "inactive") => {
    const updated = countries.map((c) =>
      c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c
    );
    localStorage.setItem("irth-countries", JSON.stringify(updated));
    setCountries(updated);
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
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-10">
        {/* رأس الصفحة */}
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Admin Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              إدارة الدول
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              إدارة الدول المتاحة على المنصة ({countries.length})
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="rounded-[var(--radius-md)] bg-[var(--color-copper)] px-6 py-2 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-espresso)]"
            >
              {showAddForm ? "إلغاء" : "+ إضافة دولة جديدة"}
            </button>
            <Link
              href="/dashboard-admin/dashboard"
              className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
            >
              ← Back
            </Link>
          </div>
        </div>

        {/* رسالة التحديث */}
        {message && (
          <div className="mt-4 rounded-[var(--radius-md)] bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* نموذج إضافة دولة جديدة */}
        {showAddForm && (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
              إضافة دولة جديدة
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  الاسم (بالعربية) *
                </label>
                <input
                  type="text"
                  value={newCountry.name}
                  onChange={(e) =>
                    setNewCountry({ ...newCountry, name: e.target.value })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  placeholder="مثال: مصر"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  الاسم (بالإنجليزية) *
                </label>
                <input
                  type="text"
                  value={newCountry.nameEn}
                  onChange={(e) =>
                    setNewCountry({ ...newCountry, nameEn: e.target.value })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  placeholder="e.g. Egypt"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  العملة (رمز)
                </label>
                <input
                  type="text"
                  value={newCountry.currency}
                  onChange={(e) =>
                    setNewCountry({ ...newCountry, currency: e.target.value })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  placeholder="EGP"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  رمز العملة (اختصار)
                </label>
                <input
                  type="text"
                  value={newCountry.currencySymbol}
                  onChange={(e) =>
                    setNewCountry({
                      ...newCountry,
                      currencySymbol: e.target.value,
                    })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  placeholder="ج.م"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  تكلفة الشحن (بالعملة المحلية)
                </label>
                <input
                  type="number"
                  value={newCountry.shippingCost}
                  onChange={(e) =>
                    setNewCountry({
                      ...newCountry,
                      shippingCost: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  حد الشحن المجاني
                </label>
                <input
                  type="number"
                  value={newCountry.freeShippingThreshold}
                  onChange={(e) =>
                    setNewCountry({
                      ...newCountry,
                      freeShippingThreshold: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
            <button
              onClick={handleAddCountry}
              className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-2 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
            >
              حفظ الدولة
            </button>
          </div>
        )}

        {/* جدول الدول */}
        {countries.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              🎉 مفيش دول مسجلة
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <div className="min-w-full rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
              {/* رأس الجدول */}
              <div className="grid grid-cols-7 gap-4 border-b border-[var(--border-soft)] bg-[var(--surface-muted)] px-6 py-3 text-xs font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                <span>الدولة</span>
                <span>العملة</span>
                <span>الشحن</span>
                <span>فري شحن</span>
                <span>الحالة</span>
                <span>إحصائيات</span>
                <span className="text-center">إجراءات</span>
              </div>

              {/* صفوف الجدول */}
              {countries.map((country) => (
                <div
                  key={country.id}
                  className="grid grid-cols-7 gap-4 border-b border-[var(--border-soft)] px-6 py-4 text-sm last:border-0 hover:bg-[var(--surface-muted)]"
                >
                  <div>
                    <p className="font-medium text-[var(--color-espresso)]">
                      {country.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {country.nameEn}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">{country.currencySymbol}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-1">
                      ({country.currency})
                    </span>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={country.shippingCost}
                      onChange={(e) =>
                        updateCountryField(
                          country.id,
                          "shippingCost",
                          Number(e.target.value)
                        )
                      }
                      className="w-20 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-2 py-1 text-sm outline-none focus:border-[var(--color-copper)]"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={country.freeShippingThreshold}
                      onChange={(e) =>
                        updateCountryField(
                          country.id,
                          "freeShippingThreshold",
                          Number(e.target.value)
                        )
                      }
                      className="w-20 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-2 py-1 text-sm outline-none focus:border-[var(--color-copper)]"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        country.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {country.status === "active" ? "نشط" : "غير نشط"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs">
                      <span className="font-medium">{country.artisanCount || 0}</span> حرفي
                    </p>
                    <p className="text-xs">
                      <span className="font-medium">{country.productCount || 0}</span> منتج
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() =>
                        updateCountryStatus(
                          country.id,
                          country.status === "active" ? "inactive" : "active"
                        )
                      }
                      className={`rounded px-3 py-1 text-xs text-white transition ${
                        country.status === "active"
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-green-500 hover:bg-green-600"
                      }`}
                    >
                      {country.status === "active" ? "إيقاف" : "تفعيل"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
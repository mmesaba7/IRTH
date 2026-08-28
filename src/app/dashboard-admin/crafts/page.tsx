"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Craft = {
  id: string;
  name: string;
  nameEn: string;
  slug: string;
  commission: number; // نسبة العمولة لهذه الحرفة
  icon: string; // أيقونة تعبيرية
  status: "active" | "inactive";
  createdAt: string;
  updatedAt?: string;
};

export default function AdminCraftsPage() {
  const router = useRouter();
  const [crafts, setCrafts] = useState<Craft[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // نموذج إضافة حرفة جديدة
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCraft, setNewCraft] = useState({
    name: "",
    nameEn: "",
    commission: 15,
    icon: "🛠️",
  });

  useEffect(() => {
    loadCrafts();
  }, [router]);

  const loadCrafts = () => {
    const storedCrafts: Craft[] = JSON.parse(
      localStorage.getItem("irth-crafts") || "[]"
    );

    // بيانات افتراضية لو مفيش حرف
    if (storedCrafts.length === 0) {
      const defaultCrafts: Craft[] = [
        {
          id: "craft-1",
          name: "السجاد اليدوي",
          nameEn: "Handmade Carpets",
          slug: "handmade-carpets",
          commission: 15,
          icon: "🧶",
          status: "active",
          createdAt: new Date().toISOString(),
        },
        {
          id: "craft-2",
          name: "الخزف والفخار",
          nameEn: "Pottery & Ceramics",
          slug: "pottery",
          commission: 12,
          icon: "🏺",
          status: "active",
          createdAt: new Date().toISOString(),
        },
        {
          id: "craft-3",
          name: "المنسوجات اليدوية",
          nameEn: "Handwoven Textiles",
          slug: "handwoven-textiles",
          commission: 14,
          icon: "🧵",
          status: "active",
          createdAt: new Date().toISOString(),
        },
        {
          id: "craft-4",
          name: "المشغولات النحاسية",
          nameEn: "Copperware",
          slug: "copperware",
          commission: 10,
          icon: "⚱️",
          status: "active",
          createdAt: new Date().toISOString(),
        },
        {
          id: "craft-5",
          name: "الأعمال الخشبية",
          nameEn: "Woodwork",
          slug: "woodwork",
          commission: 13,
          icon: "🪵",
          status: "active",
          createdAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem("irth-crafts", JSON.stringify(defaultCrafts));
      setCrafts(defaultCrafts);
      setLoading(false);
      return;
    }

    setCrafts(storedCrafts);
    setLoading(false);
  };

  const handleAddCraft = () => {
    if (!newCraft.name.trim() || !newCraft.nameEn.trim()) {
      setMessage("❌ من فضلك أدخل الاسم بالعربية والإنجليزية");
      return;
    }

    const craft: Craft = {
      id: `craft-${Date.now()}`,
      name: newCraft.name.trim(),
      nameEn: newCraft.nameEn.trim(),
      slug: newCraft.nameEn.trim().toLowerCase().replace(/ /g, "-"),
      commission: Number(newCraft.commission),
      icon: newCraft.icon || "🛠️",
      status: "active",
      createdAt: new Date().toISOString(),
    };

    const updated = [...crafts, craft];
    localStorage.setItem("irth-crafts", JSON.stringify(updated));
    setCrafts(updated);
    setNewCraft({ name: "", nameEn: "", commission: 15, icon: "🛠️" });
    setShowAddForm(false);
    setMessage("✅ تم إضافة الحرفة بنجاح");
    setTimeout(() => setMessage(""), 3000);
  };

  const updateCraftStatus = (id: string, status: "active" | "inactive") => {
    const updated = crafts.map((c) =>
      c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c
    );
    localStorage.setItem("irth-crafts", JSON.stringify(updated));
    setCrafts(updated);
  };

  const updateCraftCommission = (id: string, commission: number) => {
    if (commission < 0 || commission > 100) return;
    const updated = crafts.map((c) =>
      c.id === id ? { ...c, commission, updatedAt: new Date().toISOString() } : c
    );
    localStorage.setItem("irth-crafts", JSON.stringify(updated));
    setCrafts(updated);
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
              🏺 إدارة الحرف
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              إدارة الحرف المتاحة على المنصة ({crafts.length})
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="rounded-[var(--radius-md)] bg-[var(--color-copper)] px-6 py-2 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-espresso)]"
            >
              {showAddForm ? "إلغاء" : "+ إضافة حرفة جديدة"}
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

        {/* نموذج إضافة حرفة جديدة */}
        {showAddForm && (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
              إضافة حرفة جديدة
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  الاسم (بالعربية) *
                </label>
                <input
                  type="text"
                  value={newCraft.name}
                  onChange={(e) =>
                    setNewCraft({ ...newCraft, name: e.target.value })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  placeholder="مثال: السجاد اليدوي"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  الاسم (بالإنجليزية) *
                </label>
                <input
                  type="text"
                  value={newCraft.nameEn}
                  onChange={(e) =>
                    setNewCraft({ ...newCraft, nameEn: e.target.value })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  placeholder="e.g. Handmade Carpets"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  نسبة العمولة (%)
                </label>
                <input
                  type="number"
                  value={newCraft.commission}
                  onChange={(e) =>
                    setNewCraft({
                      ...newCraft,
                      commission: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  min="0"
                  max="100"
                  step="0.5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]">
                  الأيقونة
                </label>
                <input
                  type="text"
                  value={newCraft.icon}
                  onChange={(e) =>
                    setNewCraft({ ...newCraft, icon: e.target.value })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  placeholder="🧶"
                  maxLength={2}
                />
              </div>
            </div>
            <button
              onClick={handleAddCraft}
              className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-2 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
            >
              حفظ الحرفة
            </button>
          </div>
        )}

        {/* جدول الحرف */}
        {crafts.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              🎉 مفيش حرف مسجلة
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <div className="min-w-full rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
              {/* رأس الجدول */}
              <div className="grid grid-cols-6 gap-4 border-b border-[var(--border-soft)] bg-[var(--surface-muted)] px-6 py-3 text-xs font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                <span>الأيقونة</span>
                <span>الاسم (عربي)</span>
                <span>الاسم (إنجليزي)</span>
                <span>العمولة</span>
                <span>الحالة</span>
                <span className="text-center">إجراءات</span>
              </div>

              {/* صفوف الجدول */}
              {crafts.map((craft) => (
                <div
                  key={craft.id}
                  className="grid grid-cols-6 gap-4 border-b border-[var(--border-soft)] px-6 py-4 text-sm last:border-0 hover:bg-[var(--surface-muted)]"
                >
                  <span className="text-2xl">{craft.icon}</span>
                  <span className="font-medium text-[var(--color-espresso)]">
                    {craft.name}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    {craft.nameEn}
                  </span>
                  <span>
                    <input
                      type="number"
                      value={craft.commission}
                      onChange={(e) =>
                        updateCraftCommission(craft.id, Number(e.target.value))
                      }
                      className="w-16 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-2 py-1 text-sm outline-none focus:border-[var(--color-copper)]"
                      min="0"
                      max="100"
                      step="0.5"
                    />
                    <span className="text-xs text-[var(--text-muted)]">%</span>
                  </span>
                  <span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        craft.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {craft.status === "active" ? "نشط" : "غير نشط"}
                    </span>
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() =>
                        updateCraftStatus(
                          craft.id,
                          craft.status === "active" ? "inactive" : "active"
                        )
                      }
                      className={`rounded px-3 py-1 text-xs text-white transition ${
                        craft.status === "active"
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-green-500 hover:bg-green-600"
                      }`}
                    >
                      {craft.status === "active" ? "إيقاف" : "تفعيل"}
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

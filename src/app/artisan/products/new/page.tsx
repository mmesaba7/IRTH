"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import { createClient } from "@/lib/supabase/client";

type Craft = {
  id: string;
  name_ar: string | null;
  name_en: string;
};

type ProductForm = {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  storyAr: string;
  storyEn: string;
  materialAr: string;
  materialEn: string;
  dimensions: string;
  weight: string;
  preparationTime: string;
  price: string;
  quantity: string;
  craftId: string;
  madeToOrder: boolean;
  oneOfAKind: boolean;
  customization: boolean;
};

const initialForm: ProductForm = {
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  storyAr: "",
  storyEn: "",
  materialAr: "",
  materialEn: "",
  dimensions: "",
  weight: "",
  preparationTime: "",
  price: "",
  quantity: "",
  craftId: "",
  madeToOrder: false,
  oneOfAKind: false,
  customization: false,
};

function buildSlug(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
  return `${base || "product"}-${suffix}`;
}

export default function NewArtisanProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [crafts, setCrafts] = useState<Craft[]>([]);
  const [artisanId, setArtisanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadContext = async () => {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/artisan/login");
        return;
      }

      const [{ data: artisan, error: artisanError }, { data: craftRows, error: craftError }] =
        await Promise.all([
          supabase
            .from("artisan_profiles")
            .select("id, status")
            .eq("auth_user_id", user.id)
            .maybeSingle(),
          supabase
            .from("crafts")
            .select("id, name_ar, name_en")
            .eq("is_active", true)
            .order("name_en", { ascending: true }),
        ]);

      if (artisanError || !artisan || artisan.status !== "active") {
        setError("تعذر فتح إنشاء المنتج لهذا الحساب الحرفي.");
        setLoading(false);
        return;
      }

      if (craftError) {
        setError("تعذر تحميل الحرف المتاحة.");
        setLoading(false);
        return;
      }

      setArtisanId(artisan.id);
      setCrafts((craftRows ?? []) as Craft[]);
      setLoading(false);
    };

    void loadContext();
  }, [router]);

  const setField = <K extends keyof ProductForm>(field: K, value: ProductForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!artisanId || saving) return;

    setError("");

    if (!form.nameAr.trim() || !form.nameEn.trim()) {
      setError("اسم المنتج بالعربي والإنجليزي مطلوب.");
      return;
    }

    if (!form.craftId) {
      setError("اختار الحرفة الأساسية للمنتج.");
      return;
    }

    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      setError("السعر غير صحيح.");
      return;
    }

    let quantity: number | null = null;
    if (!form.madeToOrder) {
      quantity = Number(form.quantity);
      if (!Number.isInteger(quantity) || quantity < 0) {
        setError("الكمية يجب أن تكون رقمًا صحيحًا صفر أو أكبر.");
        return;
      }
    }

    setSaving(true);

    const supabase = createClient();
    const slug = buildSlug(form.nameEn);
    const { error: insertError } = await supabase.from("products").insert({
      slug,
      artisan_id: artisanId,
      primary_craft_id: form.craftId,
      name_ar: form.nameAr.trim(),
      name_en: form.nameEn.trim(),
      description_ar: form.descriptionAr.trim() || null,
      description_en: form.descriptionEn.trim() || null,
      story_ar: form.storyAr.trim() || null,
      story_en: form.storyEn.trim() || null,
      material_ar: form.materialAr.trim() || null,
      material_en: form.materialEn.trim() || null,
      dimensions: form.dimensions.trim() || null,
      weight: form.weight.trim() || null,
      preparation_time: form.preparationTime.trim() || null,
      price,
      quantity,
      made_to_order: form.madeToOrder,
      one_of_a_kind: form.oneOfAKind,
      customization: form.customization,
      lifecycle_status: "draft",
      published_at: null,
    });

    if (insertError) {
      setError("تعذر حفظ المنتج الجديد. راجع البيانات وحاول مرة أخرى.");
      setSaving(false);
      return;
    }

    router.push(`/artisan/products/edit/${slug}`);
    router.refresh();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center text-[var(--text-secondary)]">
          جاري تجهيز إضافة المنتج...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Artisan Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              إضافة منتج جديد
            </h1>
            <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">
              المنتج يتحفظ كمسودة أولًا، وبعد استكماله ترسله لمراجعة IRTH قبل النشر.
            </p>
          </div>
          <Link
            href="/artisan/products"
            className="text-sm text-[var(--color-copper)]"
          >
            العودة للمنتجات
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <Panel title="المعلومات الأساسية">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="اسم المنتج بالعربي">
                <input className={inputClass} value={form.nameAr} onChange={(e) => setField("nameAr", e.target.value)} />
              </Field>
              <Field label="Product name in English">
                <input className={inputClass} value={form.nameEn} onChange={(e) => setField("nameEn", e.target.value)} />
              </Field>
              <Field label="الحرفة الأساسية">
                <select className={inputClass} value={form.craftId} onChange={(e) => setField("craftId", e.target.value)}>
                  <option value="">اختار الحرفة</option>
                  {crafts.map((craft) => (
                    <option key={craft.id} value={craft.id}>
                      {craft.name_ar || craft.name_en} — {craft.name_en}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field label="الوصف بالعربي">
                <textarea rows={5} className={inputClass} value={form.descriptionAr} onChange={(e) => setField("descriptionAr", e.target.value)} />
              </Field>
              <Field label="Description in English">
                <textarea rows={5} className={inputClass} value={form.descriptionEn} onChange={(e) => setField("descriptionEn", e.target.value)} />
              </Field>
            </div>
          </Panel>

          <Panel title="الخامة والقصة والتفاصيل">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="الخامة بالعربي">
                <input className={inputClass} value={form.materialAr} onChange={(e) => setField("materialAr", e.target.value)} />
              </Field>
              <Field label="Material in English">
                <input className={inputClass} value={form.materialEn} onChange={(e) => setField("materialEn", e.target.value)} />
              </Field>
              <Field label="الأبعاد">
                <input className={inputClass} value={form.dimensions} onChange={(e) => setField("dimensions", e.target.value)} placeholder="مثال: 30 × 20 × 20 cm" />
              </Field>
              <Field label="الوزن">
                <input className={inputClass} value={form.weight} onChange={(e) => setField("weight", e.target.value)} placeholder="مثال: 1.5 kg" />
              </Field>
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field label="قصة المنتج بالعربي">
                <textarea rows={4} className={inputClass} value={form.storyAr} onChange={(e) => setField("storyAr", e.target.value)} />
              </Field>
              <Field label="Product story in English">
                <textarea rows={4} className={inputClass} value={form.storyEn} onChange={(e) => setField("storyEn", e.target.value)} />
              </Field>
            </div>
          </Panel>

          <Panel title="السعر والمخزون">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="السعر">
                <input type="number" min="0" step="0.01" className={inputClass} value={form.price} onChange={(e) => setField("price", e.target.value)} />
              </Field>
              <Field label="الكمية المتاحة">
                <input type="number" min="0" step="1" disabled={form.madeToOrder} className={inputClass} value={form.quantity} onChange={(e) => setField("quantity", e.target.value)} />
              </Field>
              {form.madeToOrder && (
                <Field label="مدة التجهيز">
                  <input className={inputClass} value={form.preparationTime} onChange={(e) => setField("preparationTime", e.target.value)} placeholder="مثال: 7–10 أيام" />
                </Field>
              )}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <CheckField label="يصنع حسب الطلب" checked={form.madeToOrder} onChange={(checked) => setField("madeToOrder", checked)} />
              <CheckField label="قطعة فريدة" checked={form.oneOfAKind} onChange={(checked) => setField("oneOfAKind", checked)} />
              <CheckField label="قابل للتخصيص" checked={form.customization} onChange={(checked) => setField("customization", checked)} />
            </div>
          </Panel>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving || !artisanId}
              className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-3 text-sm font-medium text-[var(--color-ivory)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "جاري حفظ المسودة..." : "حفظ كمسودة"}
            </button>
            <Link
              href="/artisan/products"
              className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-6 py-3 text-center text-sm text-[var(--text-secondary)]"
            >
              إلغاء
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

const inputClass =
  "w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-60";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-7">
      <h2 className="font-medium text-[var(--color-espresso)]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">{label}</span>
      {children}
    </label>
  );
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-soft)] p-4 text-sm text-[var(--text-secondary)]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../../../components/Header";
import { createClient } from "@/lib/supabase/client";

type ProductForm = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  story_ar: string;
  story_en: string;
  material_ar: string;
  material_en: string;
  price: string;
  quantity: string;
  made_to_order: boolean;
  one_of_a_kind: boolean;
  customization: boolean;
  lifecycle_status: string;
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [product, setProduct] = useState<ProductForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPendingReview, setIsPendingReview] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProduct = async () => {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/artisan/login");
        return;
      }

      const { data, error: productError } = await supabase
        .from("products")
        .select(
          "id, slug, name_ar, name_en, description_ar, description_en, story_ar, story_en, material_ar, material_en, price, quantity, made_to_order, one_of_a_kind, customization, lifecycle_status"
        )
        .eq("slug", slug)
        .maybeSingle();

      if (productError) {
        console.error("Could not load product:", productError);
        setError("تعذر تحميل المنتج.");
        setLoading(false);
        return;
      }

      if (!data) {
        setProduct(null);
        setLoading(false);
        return;
      }

      const { data: pendingRequest, error: pendingError } = await supabase
        .from("moderation_requests")
        .select("id")
        .eq("subject_type", "product")
        .eq("subject_id", data.id)
        .eq("action", "publish")
        .eq("status", "pending")
        .maybeSingle();

      if (pendingError) {
        console.error("Could not check review status:", pendingError);
        setError("تعذر التحقق من حالة المراجعة.");
        setLoading(false);
        return;
      }

      setIsPendingReview(Boolean(pendingRequest));
      setProduct({
        id: data.id,
        slug: data.slug,
        name_ar: data.name_ar ?? "",
        name_en: data.name_en ?? "",
        description_ar: data.description_ar ?? "",
        description_en: data.description_en ?? "",
        story_ar: data.story_ar ?? "",
        story_en: data.story_en ?? "",
        material_ar: data.material_ar ?? "",
        material_en: data.material_en ?? "",
        price: String(data.price ?? ""),
        quantity: String(data.quantity ?? 0),
        made_to_order: Boolean(data.made_to_order),
        one_of_a_kind: Boolean(data.one_of_a_kind),
        customization: Boolean(data.customization),
        lifecycle_status: data.lifecycle_status,
      });
      setLoading(false);
    };

    loadProduct();
  }, [router, slug]);

  const updateTextField = (
    field: keyof ProductForm,
    value: string | boolean
  ) => {
    setProduct((current) =>
      current ? { ...current, [field]: value } : current
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!product) return;

    if (product.lifecycle_status !== "draft") {
      setError("المنتج المنشور لا يمكن تعديله من هذا المسار حالياً.");
      return;
    }

    if (isPendingReview) {
      setError("لا يمكن تعديل المنتج أثناء وجوده قيد المراجعة.");
      return;
    }

    if (!product.name_ar.trim() || !product.name_en.trim()) {
      setError("اسم المنتج بالعربي والإنجليزي مطلوب.");
      return;
    }

    const price = Number(product.price);
    const quantity = Number(product.quantity);

    if (!Number.isFinite(price) || price < 0) {
      setError("السعر غير صحيح.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      setError("الكمية يجب أن تكون رقمًا صحيحًا صفر أو أكبر.");
      return;
    }

    setIsSaving(true);
    setError("");

    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("products")
      .update({
        name_ar: product.name_ar.trim(),
        name_en: product.name_en.trim(),
        description_ar: product.description_ar.trim() || null,
        description_en: product.description_en.trim() || null,
        story_ar: product.story_ar.trim() || null,
        story_en: product.story_en.trim() || null,
        material_ar: product.material_ar.trim() || null,
        material_en: product.material_en.trim() || null,
        price,
        quantity,
        made_to_order: product.made_to_order,
        one_of_a_kind: product.one_of_a_kind,
        customization: product.customization,
      })
      .eq("id", product.id);

    if (updateError) {
      console.error("Could not update product:", updateError);
      setError("تعذر حفظ التعديلات.");
      setIsSaving(false);
      return;
    }

    router.push("/artisan/products");
    router.refresh();
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

  if (!product) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 flex-col items-center justify-center gap-4">
          <p className="text-lg text-[var(--text-secondary)]">المنتج غير موجود</p>
          <button
            type="button"
            onClick={() => router.push("/artisan/products")}
            className="text-sm text-[var(--color-copper)]"
          >
            العودة للمنتجات
          </button>
        </div>
      </main>
    );
  }

  const editingDisabled =
    product.lifecycle_status !== "draft" || isPendingReview;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-16">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
            Artisan Panel
          </p>
          <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
            تعديل المنتج
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            عدّل البيانات المطلوبة ثم احفظ، وبعدها ارجع وأعد إرسال المنتج للمراجعة.
          </p>
        </div>

        {editingDisabled && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            {isPendingReview
              ? "المنتج قيد المراجعة الآن، لذلك التعديل متوقف مؤقتًا."
              : "تعديل المنتج المنشور لم يتم اعتماد آليته النهائية بعد."}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="اسم المنتج بالعربي">
              <input
                value={product.name_ar}
                onChange={(e) => updateTextField("name_ar", e.target.value)}
                disabled={editingDisabled}
                className={inputClass}
              />
            </Field>

            <Field label="Product name in English">
              <input
                value={product.name_en}
                onChange={(e) => updateTextField("name_en", e.target.value)}
                disabled={editingDisabled}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="الوصف بالعربي">
              <textarea
                rows={5}
                value={product.description_ar}
                onChange={(e) => updateTextField("description_ar", e.target.value)}
                disabled={editingDisabled}
                className={inputClass}
              />
            </Field>

            <Field label="Description in English">
              <textarea
                rows={5}
                value={product.description_en}
                onChange={(e) => updateTextField("description_en", e.target.value)}
                disabled={editingDisabled}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="الخامة بالعربي">
              <input
                value={product.material_ar}
                onChange={(e) => updateTextField("material_ar", e.target.value)}
                disabled={editingDisabled}
                className={inputClass}
              />
            </Field>

            <Field label="Material in English">
              <input
                value={product.material_en}
                onChange={(e) => updateTextField("material_en", e.target.value)}
                disabled={editingDisabled}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="قصة المنتج بالعربي">
              <textarea
                rows={4}
                value={product.story_ar}
                onChange={(e) => updateTextField("story_ar", e.target.value)}
                disabled={editingDisabled}
                className={inputClass}
              />
            </Field>

            <Field label="Product story in English">
              <textarea
                rows={4}
                value={product.story_en}
                onChange={(e) => updateTextField("story_en", e.target.value)}
                disabled={editingDisabled}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field label="السعر">
              <input
                type="number"
                min="0"
                step="0.01"
                value={product.price}
                onChange={(e) => updateTextField("price", e.target.value)}
                disabled={editingDisabled}
                className={inputClass}
              />
            </Field>

            <Field label="الكمية">
              <input
                type="number"
                min="0"
                step="1"
                value={product.quantity}
                onChange={(e) => updateTextField("quantity", e.target.value)}
                disabled={editingDisabled}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <CheckField
              label="يصنع حسب الطلب"
              checked={product.made_to_order}
              disabled={editingDisabled}
              onChange={(checked) => updateTextField("made_to_order", checked)}
            />
            <CheckField
              label="قطعة فريدة"
              checked={product.one_of_a_kind}
              disabled={editingDisabled}
              onChange={(checked) => updateTextField("one_of_a_kind", checked)}
            />
            <CheckField
              label="قابل للتخصيص"
              checked={product.customization}
              disabled={editingDisabled}
              onChange={(checked) => updateTextField("customization", checked)}
            />
          </div>

          <div className="flex flex-col gap-3 pt-3 sm:flex-row">
            <button
              type="submit"
              disabled={editingDisabled || isSaving}
              className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-3 text-sm font-medium text-[var(--color-ivory)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/artisan/products")}
              className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-6 py-3 text-sm text-[var(--text-secondary)]"
            >
              إلغاء
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

const inputClass =
  "w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-60";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function CheckField({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-soft)] p-4 text-sm text-[var(--text-secondary)]">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

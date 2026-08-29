"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { createClient } from "@/lib/supabase/client";

type ProductRow = {
  id: string;
  slug: string;
  name_ar: string | null;
  name_en: string;
  price: number | string;
};

type PromotionRow = {
  id: string;
  discount_type: "percentage" | "fixed";
  discount_value: number | string;
  approval_status: "pending" | "approved" | "rejected";
  is_enabled: boolean;
  start_at: string;
  end_at: string;
  admin_note: string | null;
  created_at: string;
};

type PromotionProductRow = {
  promotion_id: string;
  product_id: string;
};

type PromotionView = PromotionRow & {
  productNames: string[];
};

type PromotionForm = {
  discountType: "percentage" | "fixed";
  discountValue: number;
  productIds: string[];
  startAt: string;
  endAt: string;
};

const emptyForm: PromotionForm = {
  discountType: "percentage",
  discountValue: 10,
  productIds: [],
  startAt: "",
  endAt: "",
};

function promotionStatus(promotion: PromotionRow) {
  if (promotion.approval_status === "pending") return "قيد المراجعة";
  if (promotion.approval_status === "rejected") return "مرفوض";
  if (!promotion.is_enabled) return "متوقف";

  const now = Date.now();
  const start = new Date(promotion.start_at).getTime();
  const end = new Date(promotion.end_at).getTime();

  if (now < start) return "مجدول";
  if (now >= end) return "منتهي";
  return "نشط";
}

export default function ArtisanPromotionsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [promotions, setPromotions] = useState<PromotionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<PromotionForm>(emptyForm);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        router.replace("/artisan/login");
        return;
      }

      const { data: artisan, error: artisanError } = await supabase
        .from("artisan_profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (cancelled) return;

      if (artisanError || !artisan) {
        setError("لا يوجد ملف حرفي نشط مرتبط بهذا الحساب.");
        setLoading(false);
        return;
      }

      const [productsResult, promotionsResult] = await Promise.all([
        supabase
          .from("products")
          .select("id, slug, name_ar, name_en, price")
          .eq("artisan_id", artisan.id)
          .eq("lifecycle_status", "published")
          .order("created_at", { ascending: false }),
        supabase
          .from("promotions")
          .select(
            "id, discount_type, discount_value, approval_status, is_enabled, start_at, end_at, admin_note, created_at"
          )
          .eq("source_type", "artisan")
          .eq("artisan_id", artisan.id)
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      if (productsResult.error || promotionsResult.error) {
        console.error("Could not load artisan promotions:", {
          products: productsResult.error,
          promotions: promotionsResult.error,
        });
        setError("تعذر تحميل العروض حاليًا.");
        setLoading(false);
        return;
      }

      const productRows = (productsResult.data ?? []) as ProductRow[];
      const promotionRows = (promotionsResult.data ?? []) as PromotionRow[];
      const productMap = new Map(productRows.map((product) => [product.id, product]));

      let links: PromotionProductRow[] = [];
      if (promotionRows.length > 0) {
        const { data: linkData, error: linkError } = await supabase
          .from("promotion_products")
          .select("promotion_id, product_id")
          .in(
            "promotion_id",
            promotionRows.map((promotion) => promotion.id)
          );

        if (cancelled) return;

        if (linkError) {
          console.error("Could not load promotion products:", linkError);
          setError("تعذر تحميل منتجات العروض.");
          setLoading(false);
          return;
        }

        links = (linkData ?? []) as PromotionProductRow[];
      }

      const mappedPromotions: PromotionView[] = promotionRows.map((promotion) => ({
        ...promotion,
        productNames: links
          .filter((link) => link.promotion_id === promotion.id)
          .map((link) => productMap.get(link.product_id))
          .filter((product): product is ProductRow => Boolean(product))
          .map((product) => product.name_ar || product.name_en),
      }));

      setProducts(productRows);
      setPromotions(mappedPromotions);
      setLoading(false);
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const toggleProduct = (productId: string) => {
    setForm((current) => ({
      ...current,
      productIds: current.productIds.includes(productId)
        ? current.productIds.filter((id) => id !== productId)
        : [...current.productIds, productId],
    }));
  };

  const submitPromotion = async () => {
    setError("");
    setMessage("");

    if (form.productIds.length === 0) {
      setError("اختر منتج واحد على الأقل.");
      return;
    }

    if (!form.startAt || !form.endAt) {
      setError("حدد تاريخ ووقت بداية ونهاية العرض.");
      return;
    }

    if (form.discountValue <= 0) {
      setError("قيمة الخصم يجب أن تكون أكبر من صفر.");
      return;
    }

    if (form.discountType === "percentage" && form.discountValue > 100) {
      setError("نسبة الخصم لا يمكن أن تتجاوز 100%.");
      return;
    }

    const startAt = new Date(form.startAt);
    const endAt = new Date(form.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      setError("وقت نهاية العرض يجب أن يكون بعد وقت البداية.");
      return;
    }

    setSubmitting(true);

    const { error: submitError } = await supabase.rpc("submit_artisan_promotion", {
      p_discount_type: form.discountType,
      p_discount_value: form.discountValue,
      p_start_at: startAt.toISOString(),
      p_end_at: endAt.toISOString(),
      p_product_ids: form.productIds,
    });

    if (submitError) {
      console.error("Could not submit artisan promotion:", submitError);
      setError("تعذر إرسال العرض للمراجعة.");
      setSubmitting(false);
      return;
    }

    setMessage("تم إرسال العرض لمراجعة IRTH بنجاح.");
    setForm(emptyForm);
    setShowForm(false);
    setSubmitting(false);
    router.refresh();

    const { data: refreshed } = await supabase
      .from("promotions")
      .select(
        "id, discount_type, discount_value, approval_status, is_enabled, start_at, end_at, admin_note, created_at"
      )
      .eq("source_type", "artisan")
      .order("created_at", { ascending: false });

    if (refreshed) {
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري تحميل العروض...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-5 py-10 md:px-6 md:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Artisan Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              العروض والخصومات
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              عروض الحرفيين تحتاج موافقة IRTH قبل ظهورها للعملاء.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            disabled={products.length === 0}
            className="rounded-[var(--radius-md)] bg-[var(--color-copper)] px-5 py-3 text-sm font-medium text-[var(--color-ivory)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showForm ? "إلغاء" : "+ عرض جديد"}
          </button>
        </div>

        {message && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {products.length === 0 && (
          <div className="mt-6 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-6 text-sm text-[var(--text-secondary)]">
            تحتاج منتج منشور واحد على الأقل قبل إنشاء عرض.
          </div>
        )}

        {showForm && products.length > 0 && (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
              عرض جديد
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-[var(--text-secondary)]">
                نوع الخصم
                <select
                  value={form.discountType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      discountType: event.target.value as "percentage" | "fixed",
                    }))
                  }
                  className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3"
                >
                  <option value="percentage">نسبة مئوية</option>
                  <option value="fixed">مبلغ ثابت</option>
                </select>
              </label>

              <label className="text-sm text-[var(--text-secondary)]">
                قيمة الخصم
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.discountValue}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      discountValue: Number(event.target.value),
                    }))
                  }
                  className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3"
                />
              </label>

              <label className="text-sm text-[var(--text-secondary)]">
                البداية
                <input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, startAt: event.target.value }))
                  }
                  className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3"
                />
              </label>

              <label className="text-sm text-[var(--text-secondary)]">
                النهاية
                <input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, endAt: event.target.value }))
                  }
                  className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3"
                />
              </label>
            </div>

            <div className="mt-5">
              <p className="text-sm text-[var(--text-secondary)]">المنتجات المنشورة</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {products.map((product) => {
                  const selected = form.productIds.includes(product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => toggleProduct(product.id)}
                      className={`rounded-full px-4 py-2 text-sm ${
                        selected
                          ? "bg-[var(--color-espresso)] text-[var(--color-ivory)]"
                          : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {product.name_ar || product.name_en} · ${Number(product.price).toFixed(2)}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={submitPromotion}
              disabled={submitting}
              className="mt-6 rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-3 text-sm font-medium text-[var(--color-ivory)] disabled:opacity-60"
            >
              {submitting ? "جاري الإرسال..." : "إرسال للمراجعة"}
            </button>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {promotions.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-8 text-center text-[var(--text-secondary)]">
              لا توجد عروض حتى الآن.
            </div>
          ) : (
            promotions.map((promotion) => (
              <article
                key={promotion.id}
                className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                      {promotion.discount_type === "percentage"
                        ? `${Number(promotion.discount_value)}% خصم`
                        : `$${Number(promotion.discount_value).toFixed(2)} خصم`}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {promotion.productNames.length > 0
                        ? promotion.productNames.join("، ")
                        : "منتجات مرتبطة بالعرض"}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {new Date(promotion.start_at).toLocaleString("ar-EG")} → {new Date(promotion.end_at).toLocaleString("ar-EG")}
                    </p>
                  </div>

                  <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--color-espresso)]">
                    {promotionStatus(promotion)}
                  </span>
                </div>

                {promotion.admin_note && (
                  <div className="mt-4 rounded-[var(--radius-md)] bg-red-50 p-3 text-sm text-red-700">
                    <strong>ملاحظة IRTH:</strong> {promotion.admin_note}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

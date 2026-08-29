"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProductRow = {
  id: string;
  slug: string;
  artisan_id: string;
  name_ar: string | null;
  name_en: string;
  price: number | string;
};

type ArtisanRow = {
  id: string;
  name_ar: string | null;
  name_en: string;
};

type PromotionRow = {
  id: string;
  discount_type: "percentage" | "fixed";
  discount_value: number | string;
  approval_status: "pending" | "approved" | "rejected";
  is_enabled: boolean;
  start_at: string;
  end_at: string;
  created_at: string;
};

type PromotionProductRow = {
  promotion_id: string;
  product_id: string;
};

type ProductView = ProductRow & {
  artisanName: string;
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

function displayStatus(promotion: PromotionRow) {
  if (!promotion.is_enabled) return "Disabled";
  const now = Date.now();
  if (now < new Date(promotion.start_at).getTime()) return "Scheduled";
  if (now >= new Date(promotion.end_at).getTime()) return "Expired";
  return "Active";
}

export default function AdminPromotionsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [products, setProducts] = useState<ProductView[]>([]);
  const [promotions, setPromotions] = useState<PromotionView[]>([]);
  const [form, setForm] = useState<PromotionForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/dashboard-admin/login");
      return;
    }

    const [productsResult, artisansResult, promotionsResult] = await Promise.all([
      supabase
        .from("products")
        .select("id, slug, artisan_id, name_ar, name_en, price")
        .eq("lifecycle_status", "published")
        .order("created_at", { ascending: false }),
      supabase
        .from("artisan_profiles")
        .select("id, name_ar, name_en")
        .eq("status", "active"),
      supabase
        .from("promotions")
        .select(
          "id, discount_type, discount_value, approval_status, is_enabled, start_at, end_at, created_at"
        )
        .eq("source_type", "irth")
        .order("created_at", { ascending: false }),
    ]);

    if (productsResult.error || artisansResult.error || promotionsResult.error) {
      console.error("Could not load IRTH promotions:", {
        products: productsResult.error,
        artisans: artisansResult.error,
        promotions: promotionsResult.error,
      });
      setError("تعذر تحميل بيانات عروض IRTH.");
      setLoading(false);
      return;
    }

    const artisanMap = new Map(
      ((artisansResult.data ?? []) as ArtisanRow[]).map((artisan) => [artisan.id, artisan])
    );

    const productRows = (productsResult.data ?? []) as ProductRow[];
    const visibleProducts: ProductView[] = productRows
      .filter((product) => artisanMap.has(product.artisan_id))
      .map((product) => {
        const artisan = artisanMap.get(product.artisan_id);
        return {
          ...product,
          artisanName: artisan?.name_ar || artisan?.name_en || "",
        };
      });

    const promotionRows = (promotionsResult.data ?? []) as PromotionRow[];
    let links: PromotionProductRow[] = [];

    if (promotionRows.length > 0) {
      const { data: linkData, error: linkError } = await supabase
        .from("promotion_products")
        .select("promotion_id, product_id")
        .in(
          "promotion_id",
          promotionRows.map((promotion) => promotion.id)
        );

      if (linkError) {
        console.error("Could not load IRTH promotion products:", linkError);
        setError("تعذر تحميل منتجات العروض.");
        setLoading(false);
        return;
      }

      links = (linkData ?? []) as PromotionProductRow[];
    }

    const productMap = new Map(visibleProducts.map((product) => [product.id, product]));
    const mappedPromotions: PromotionView[] = promotionRows.map((promotion) => ({
      ...promotion,
      productNames: links
        .filter((link) => link.promotion_id === promotion.id)
        .map((link) => productMap.get(link.product_id))
        .filter((product): product is ProductView => Boolean(product))
        .map((product) => product.name_ar || product.name_en),
    }));

    setProducts(visibleProducts);
    setPromotions(mappedPromotions);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const toggleProduct = (productId: string) => {
    setForm((current) => ({
      ...current,
      productIds: current.productIds.includes(productId)
        ? current.productIds.filter((id) => id !== productId)
        : [...current.productIds, productId],
    }));
  };

  const createPromotion = async () => {
    setError("");
    setMessage("");

    if (form.productIds.length === 0) {
      setError("اختر منتج واحد على الأقل.");
      return;
    }

    if (!form.startAt || !form.endAt) {
      setError("حدد وقت بداية ونهاية العرض.");
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
      setError("وقت النهاية يجب أن يكون بعد وقت البداية.");
      return;
    }

    setSubmitting(true);

    const { error: createError } = await supabase.rpc("create_irth_promotion", {
      p_discount_type: form.discountType,
      p_discount_value: form.discountValue,
      p_start_at: startAt.toISOString(),
      p_end_at: endAt.toISOString(),
      p_product_ids: form.productIds,
    });

    if (createError) {
      console.error("Could not create IRTH promotion:", createError);
      setError("تعذر إنشاء عرض IRTH.");
      setSubmitting(false);
      return;
    }

    setForm(emptyForm);
    setShowForm(false);
    setSubmitting(false);
    setMessage("تم إنشاء عرض IRTH واعتماده.");
    await loadData();
  };

  const toggleEnabled = async (promotion: PromotionView) => {
    setBusyId(promotion.id);
    setError("");
    setMessage("");

    const { error: toggleError } = await supabase.rpc("set_promotion_enabled", {
      p_promotion_id: promotion.id,
      p_is_enabled: !promotion.is_enabled,
    });

    if (toggleError) {
      console.error("Could not toggle IRTH promotion:", toggleError);
      setError("تعذر تغيير حالة العرض.");
      setBusyId(null);
      return;
    }

    setMessage(promotion.is_enabled ? "تم إيقاف العرض." : "تم تشغيل العرض.");
    setBusyId(null);
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--text-secondary)]">جاري تحميل عروض IRTH...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <section className="mx-auto max-w-[var(--container-max)] px-5 py-10 md:px-6">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Admin Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              عروض IRTH
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              عروض IRTH تُنشأ من الإدارة وتكون معتمدة مباشرة. Coupon Engine مؤجل لمرحلة Shopping/Money.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowForm((value) => !value)}
              disabled={products.length === 0}
              className="rounded-[var(--radius-md)] bg-[var(--color-copper)] px-5 py-2.5 text-sm font-medium text-[var(--color-ivory)] disabled:opacity-50"
            >
              {showForm ? "إلغاء" : "+ عرض IRTH جديد"}
            </button>
            <Link
              href="/dashboard-admin/dashboard"
              className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2.5 text-sm text-[var(--text-muted)]"
            >
              ← Back
            </Link>
          </div>
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

        {showForm && (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
            <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
              إنشاء عرض IRTH
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
                    setForm((current) => ({ ...current, discountValue: Number(event.target.value) }))
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
              <p className="text-sm text-[var(--text-secondary)]">المنتجات المنشورة المتاحة</p>
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
                      {product.name_ar || product.name_en} · {product.artisanName}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={createPromotion}
              disabled={submitting}
              className="mt-6 rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-3 text-sm font-medium text-[var(--color-ivory)] disabled:opacity-60"
            >
              {submitting ? "جاري الإنشاء..." : "إنشاء واعتماد العرض"}
            </button>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {promotions.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-8 text-center text-[var(--text-secondary)]">
              لا توجد عروض IRTH حتى الآن.
            </div>
          ) : (
            promotions.map((promotion) => (
              <article
                key={promotion.id}
                className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                        {promotion.discount_type === "percentage"
                          ? `${Number(promotion.discount_value)}% خصم`
                          : `$${Number(promotion.discount_value).toFixed(2)} خصم`}
                      </h2>
                      <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium">
                        {displayStatus(promotion)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {promotion.productNames.join("، ") || "منتجات مرتبطة بالعرض"}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {new Date(promotion.start_at).toLocaleString("ar-EG")} → {new Date(promotion.end_at).toLocaleString("ar-EG")}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={busyId === promotion.id}
                    onClick={() => toggleEnabled(promotion)}
                    className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {promotion.is_enabled ? "إيقاف" : "تشغيل"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

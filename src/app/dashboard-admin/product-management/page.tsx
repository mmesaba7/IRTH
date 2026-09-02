"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type AdminProduct = {
  id: string;
  slug: string;
  artisan_id: string;
  name_ar: string | null;
  name_en: string;
  lifecycle_status: string;
  price: number | string;
  quantity: number | null;
  made_to_order: boolean;
  created_at: string;
};

type Artisan = {
  id: string;
  name_ar: string | null;
  name_en: string;
};

type PendingReview = {
  subject_id: string;
};

type ProductRow = AdminProduct & {
  artisanName: string;
  pendingReview: boolean;
};

export default function AdminProductManagementPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [workingProductId, setWorkingProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/dashboard-admin/login");
      return;
    }

    const { data: productRows, error: productError } = await supabase
      .from("products")
      .select(
        "id, slug, artisan_id, name_ar, name_en, lifecycle_status, price, quantity, made_to_order, created_at"
      )
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (productError) {
      setError("تعذر تحميل المنتجات.");
      setLoading(false);
      return;
    }

    const typedProducts = (productRows ?? []) as AdminProduct[];
    if (typedProducts.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const artisanIds = [...new Set(typedProducts.map((product) => product.artisan_id))];
    const productIds = typedProducts.map((product) => product.id);

    const [artisansResult, pendingResult] = await Promise.all([
      supabase
        .from("artisan_profiles")
        .select("id, name_ar, name_en")
        .in("id", artisanIds),
      supabase
        .from("moderation_requests")
        .select("subject_id")
        .eq("subject_type", "product")
        .eq("action", "publish")
        .eq("status", "pending")
        .in("subject_id", productIds),
    ]);

    if (artisansResult.error || pendingResult.error) {
      setError("تعذر تحميل بيانات إدارة المنتجات.");
      setLoading(false);
      return;
    }

    const artisans = (artisansResult.data ?? []) as Artisan[];
    const pending = (pendingResult.data ?? []) as PendingReview[];
    const artisanMap = new Map(artisans.map((artisan) => [artisan.id, artisan]));
    const pendingSet = new Set(pending.map((request) => request.subject_id));

    setProducts(
      typedProducts.map((product) => {
        const artisan = artisanMap.get(product.artisan_id);
        return {
          ...product,
          artisanName:
            artisan?.name_ar || artisan?.name_en || "Unknown artisan",
          pendingReview: pendingSet.has(product.id),
        };
      })
    );
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const publishedCount = useMemo(
    () => products.filter((product) => product.lifecycle_status === "published").length,
    [products]
  );

  const archiveProduct = async (product: ProductRow) => {
    if (workingProductId) return;

    const reason = (reasons[product.id] ?? "").trim();
    if (!reason) {
      setError("اكتب سبب إزالة المنتج قبل الحذف.");
      return;
    }
    if (reason.length > 500) {
      setError("سبب الإزالة يجب ألا يزيد عن 500 حرف.");
      return;
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من إزالة المنتج \"${product.name_ar || product.name_en}\"؟ سيتم إخفاؤه من المتجر مع الاحتفاظ بسجله التاريخي، وسيصل السبب للحرفي.`
    );
    if (!confirmed) return;

    setWorkingProductId(product.id);
    setError("");
    setSuccessMessage("");

    const supabase = createClient();
    const { error: archiveError } = await supabase.rpc("admin_archive_product", {
      target_product_id: product.id,
      target_reason: reason,
    });

    if (archiveError) {
      setError("تعذر إزالة المنتج. تأكد من صلاحيات السوبر أدمن وحاول مرة أخرى.");
      setWorkingProductId(null);
      return;
    }

    setProducts((current) => current.filter((item) => item.id !== product.id));
    setReasons((current) => {
      const next = { ...current };
      delete next[product.id];
      return next;
    });
    setSuccessMessage("تمت إزالة المنتج بأمان وتسجيل السبب وإرساله للحرفي.");
    setWorkingProductId(null);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <div className="flex h-96 items-center justify-center text-[var(--text-secondary)]">
          جاري تحميل إدارة المنتجات...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[var(--container-max)] px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Admin Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] sm:text-4xl">
              Product Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
              إدارة كل المنتجات غير المؤرشفة. الإزالة هنا Soft Archive: تختفي من المتجر مع الاحتفاظ بتاريخ الطلبات والمراجعات، ويتم تسجيل السبب وإرساله للحرفي.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard-admin/products"
              className="rounded-[var(--radius-md)] border border-[var(--color-copper)] px-4 py-2 text-sm text-[var(--color-copper)]"
            >
              Product Review
            </Link>
            <Link
              href="/dashboard-admin/dashboard"
              className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-muted)]"
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
          <span className="rounded-full bg-[var(--surface-muted)] px-4 py-2">
            المنتجات: {products.length}
          </span>
          <span className="rounded-full bg-[var(--surface-muted)] px-4 py-2">
            المنشورة: {publishedCount}
          </span>
        </div>

        {successMessage && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {products.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center text-[var(--text-secondary)]">
            لا توجد منتجات غير مؤرشفة حاليًا.
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {products.map((product) => {
              const isWorking = workingProductId === product.id;
              return (
                <article
                  key={product.id}
                  className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                          {product.name_ar || product.name_en}
                        </h2>
                        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs capitalize text-[var(--text-secondary)]">
                          {product.lifecycle_status}
                        </span>
                        {product.pendingReview && (
                          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs text-yellow-700">
                            Pending Review
                          </span>
                        )}
                      </div>
                      {product.name_ar && product.name_en && (
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {product.name_en}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Artisan: {product.artisanName}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        Base price: {product.price} · {product.made_to_order ? "Made to Order" : `Quantity: ${product.quantity ?? 0}`}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Created: {new Date(product.created_at).toLocaleString()}
                      </p>
                    </div>

                    {product.lifecycle_status === "published" && (
                      <Link
                        href={`/product/${product.slug}`}
                        className="text-sm font-medium text-[var(--color-copper)] hover:underline"
                      >
                        عرض المنتج →
                      </Link>
                    )}
                  </div>

                  <div className="mt-5 border-t border-[var(--border-soft)] pt-5">
                    <label className="block text-sm font-medium text-[var(--color-espresso)]">
                      سبب الإزالة <span className="text-red-600">*</span>
                      <textarea
                        value={reasons[product.id] ?? ""}
                        onChange={(event) =>
                          setReasons((current) => ({
                            ...current,
                            [product.id]: event.target.value.slice(0, 500),
                          }))
                        }
                        rows={3}
                        maxLength={500}
                        placeholder="مثال: المنتج مخالف لسياسة IRTH أو المحتوى لا يطابق المنتج المعروض."
                        className="mt-2 w-full resize-y rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-red-300"
                      />
                    </label>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xs text-[var(--text-muted)]">
                        {(reasons[product.id] ?? "").length}/500
                      </span>
                      <button
                        type="button"
                        disabled={Boolean(workingProductId)}
                        onClick={() => void archiveProduct(product)}
                        className="rounded-[var(--radius-md)] border border-red-300 px-5 py-2.5 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isWorking ? "جاري الإزالة..." : "إزالة المنتج"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

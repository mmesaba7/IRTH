"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../../components/Header";
import { createClient } from "@/lib/supabase/client";

type ReviewStatus = "pending" | "approved" | "rejected";

type ArtisanProduct = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  story_en: string | null;
  story_ar: string | null;
  material_en: string | null;
  material_ar: string | null;
  price: number;
  lifecycle_status: string;
  quantity: number;
  made_to_order: boolean;
  one_of_a_kind: boolean;
  customization: boolean;
};

type ModerationRequest = {
  id: string;
  subject_id: string;
  status: ReviewStatus;
  admin_note: string | null;
  submitted_at: string;
};

type ProductMedia = {
  id: string;
  media_type: "image" | "video";
  sort_order: number;
  signedUrl: string;
};

export default function ArtisanProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ArtisanProduct[]>([]);
  const [reviews, setReviews] = useState<Record<string, ModerationRequest>>({});
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [mediaByProductId, setMediaByProductId] = useState<Record<string, ProductMedia[]>>({});
  const [mediaLoadingProductId, setMediaLoadingProductId] = useState<string | null>(null);
  const [submittingProductId, setSubmittingProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadProducts = async () => {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/artisan/login");
      return;
    }

    const { data: artisan, error: artisanError } = await supabase
      .from("artisan_profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (artisanError || !artisan) {
      setError("تعذر تحميل بيانات الحرفي.");
      setLoading(false);
      return;
    }

    const { data: productRows, error: productError } = await supabase
      .from("products")
      .select(
        "id, slug, name_en, name_ar, description_en, description_ar, story_en, story_ar, material_en, material_ar, price, lifecycle_status, quantity, made_to_order, one_of_a_kind, customization"
      )
      .eq("artisan_id", artisan.id)
      .order("created_at", { ascending: false });

    if (productError) {
      setError("تعذر تحميل المنتجات.");
      setLoading(false);
      return;
    }

    const artisanProducts = (productRows ?? []) as ArtisanProduct[];
    setProducts(artisanProducts);

    if (artisanProducts.length === 0) {
      setReviews({});
      setLoading(false);
      return;
    }

    const { data: reviewRows, error: reviewError } = await supabase
      .from("moderation_requests")
      .select("id, subject_id, status, admin_note, submitted_at")
      .eq("subject_type", "product")
      .eq("action", "publish")
      .in("subject_id", artisanProducts.map((product) => product.id))
      .order("submitted_at", { ascending: false });

    if (reviewError) {
      setError("تعذر تحميل حالة المراجعة.");
      setLoading(false);
      return;
    }

    const latest: Record<string, ModerationRequest> = {};

    for (const row of (reviewRows ?? []) as ModerationRequest[]) {
      if (!latest[row.subject_id]) {
        latest[row.subject_id] = row;
      }
    }

    setReviews(latest);
    setLoading(false);
  };

  const loadProductMedia = async (productId: string) => {
    if (mediaByProductId[productId]) return;

    setMediaLoadingProductId(productId);

    try {
      const response = await fetch(`/api/products/${productId}/media`);

      if (!response.ok) throw new Error("Could not load media");

      const result = await response.json();
      setMediaByProductId((current) => ({
        ...current,
        [productId]: result.media ?? [],
      }));
    } catch (mediaError) {
      console.error(mediaError);
      setError("تعذر تحميل صور وفيديو المنتج.");
    } finally {
      setMediaLoadingProductId(null);
    }
  };

  const toggleDetails = async (productId: string) => {
    if (expandedProductId === productId) {
      setExpandedProductId(null);
      return;
    }

    setExpandedProductId(productId);
    await loadProductMedia(productId);
  };

  const submitForReview = async (productId: string) => {
    const currentReview = reviews[productId];

    if (currentReview?.status === "pending") return;

    setSubmittingProductId(productId);
    setError("");
    setSuccessMessage("");

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/artisan/login");
      return;
    }

    const { data, error: submitError } = await supabase
      .from("moderation_requests")
      .insert({
        subject_type: "product",
        subject_id: productId,
        action: "publish",
        status: "pending",
        requested_by: user.id,
      })
      .select("id, subject_id, status, admin_note, submitted_at")
      .single();

    if (submitError) {
      if (submitError.code === "23505") {
        setError("هذا المنتج مُرسل للمراجعة بالفعل.");
        await loadProducts();
      } else {
        setError("تعذر إرسال المنتج للمراجعة.");
      }

      setSubmittingProductId(null);
      return;
    }

    setReviews((current) => ({
      ...current,
      [productId]: data as ModerationRequest,
    }));
    setSuccessMessage(
      currentReview?.status === "rejected"
        ? "تم إعادة إرسال المنتج للمراجعة بنجاح."
        : "تم إرسال المنتج للمراجعة بنجاح."
    );
    setSubmittingProductId(null);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري تحميل المنتجات...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-4 py-10 sm:px-6 md:py-16">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
            Artisan Panel
          </p>
          <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
            إدارة المنتجات
          </h1>
          <p className="text-[var(--text-secondary)]">
            منتجاتك وحالة مراجعتها على IRTH
          </p>
        </div>

        {successMessage && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {products.length === 0 ? (
          <div className="mt-10 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center text-[var(--text-secondary)]">
            لا توجد منتجات حالياً.
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {products.map((product) => {
              const review = reviews[product.id];
              const isPending = review?.status === "pending";
              const isRejected = review?.status === "rejected";
              const isPublished = product.lifecycle_status === "published";
              const canEdit = product.lifecycle_status === "draft" && !isPending;
              const isExpanded = expandedProductId === product.id;
              const isSubmitting = submittingProductId === product.id;
              const media = mediaByProductId[product.id] ?? [];

              return (
                <article
                  key={product.id}
                  className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                          {product.name_ar || product.name_en}
                        </h2>
                        <StatusBadge
                          published={isPublished}
                          pending={isPending}
                          rejected={isRejected}
                        />
                      </div>

                      {product.name_ar && product.name_en && (
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {product.name_en}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                        <span>السعر: ${product.price}</span>
                        <span>الكمية: {product.quantity}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                        {product.made_to_order && <Tag>يصنع حسب الطلب</Tag>}
                        {product.one_of_a_kind && <Tag>قطعة فريدة</Tag>}
                        {product.customization && <Tag>قابل للتخصيص</Tag>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleDetails(product.id)}
                        className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-secondary)]"
                      >
                        {isExpanded ? "إغلاق التفاصيل" : "عرض التفاصيل"}
                      </button>

                      {canEdit && (
                        <Link
                          href={`/artisan/products/edit/${product.slug}`}
                          className="rounded-[var(--radius-md)] border border-[var(--color-copper)] px-4 py-2 text-sm text-[var(--color-copper)]"
                        >
                          تعديل المنتج
                        </Link>
                      )}
                    </div>
                  </div>

                  {isRejected && review?.admin_note && (
                    <div className="mt-5 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      <strong>سبب الرفض من IRTH:</strong>
                      <p className="mt-1">{review.admin_note}</p>
                    </div>
                  )}

                  {product.lifecycle_status === "draft" && (
                    <div className="mt-5">
                      {isPending ? (
                        <button
                          type="button"
                          disabled
                          className="cursor-not-allowed rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-5 py-3 text-sm text-[var(--text-muted)]"
                        >
                          قيد المراجعة
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => submitForReview(product.id)}
                          className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-5 py-3 text-sm font-medium text-[var(--color-ivory)] disabled:opacity-60"
                        >
                          {isSubmitting
                            ? "جاري الإرسال..."
                            : isRejected
                            ? "إعادة الإرسال للمراجعة"
                            : "إرسال للمراجعة"}
                        </button>
                      )}
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-6 border-t border-[var(--border-soft)] pt-6">
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-5">
                          <Detail title="الوصف">
                            {product.description_ar || product.description_en || "لا يوجد وصف."}
                          </Detail>
                          <Detail title="القصة">
                            {product.story_ar || product.story_en || "لا توجد قصة."}
                          </Detail>
                          <Detail title="الخامة">
                            {product.material_ar || product.material_en || "غير محددة"}
                          </Detail>
                        </div>

                        <section>
                          <h3 className="font-medium text-[var(--color-espresso)]">
                            الصور والفيديو
                          </h3>

                          {mediaLoadingProductId === product.id ? (
                            <p className="mt-3 text-sm text-[var(--text-secondary)]">
                              جاري تحميل الوسائط...
                            </p>
                          ) : media.length === 0 ? (
                            <p className="mt-3 text-sm text-[var(--text-muted)]">
                              لا توجد وسائط لهذا المنتج.
                            </p>
                          ) : (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              {media.map((item) =>
                                item.media_type === "image" ? (
                                  <img
                                    key={item.id}
                                    src={item.signedUrl}
                                    alt={product.name_en || product.name_ar}
                                    className="h-40 w-full rounded-[var(--radius-md)] object-cover"
                                  />
                                ) : (
                                  <video
                                    key={item.id}
                                    src={item.signedUrl}
                                    controls
                                    className="h-40 w-full rounded-[var(--radius-md)] bg-black object-cover"
                                  />
                                )
                              )}
                            </div>
                          )}
                        </section>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function StatusBadge({
  published,
  pending,
  rejected,
}: {
  published: boolean;
  pending: boolean;
  rejected: boolean;
}) {
  const label = published
    ? "منشور"
    : pending
    ? "قيد المراجعة"
    : rejected
    ? "مرفوض - يحتاج تعديل"
    : "مسودة";

  const className = published
    ? "bg-green-100 text-green-700"
    : pending
    ? "bg-blue-100 text-blue-700"
    : rejected
    ? "bg-red-100 text-red-700"
    : "bg-amber-100 text-amber-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">
      {children}
    </span>
  );
}

function Detail({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="font-medium text-[var(--color-espresso)]">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
        {children}
      </p>
    </section>
  );
}

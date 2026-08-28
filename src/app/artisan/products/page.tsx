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
  reviewed_at: string | null;
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
  const [latestReviewByProductId, setLatestReviewByProductId] = useState<
    Record<string, ModerationRequest | undefined>
  >({});
  const [expandedProductId, setExpandedProductId] = useState<string | null>(
    null
  );
  const [mediaByProductId, setMediaByProductId] = useState<
    Record<string, ProductMedia[]>
  >({});
  const [mediaLoadingProductId, setMediaLoadingProductId] = useState<
    string | null
  >(null);
  const [submittingProductId, setSubmittingProductId] = useState<string | null>(
    null
  );

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

    const { data: artisanProfile, error: artisanError } = await supabase
      .from("artisan_profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (artisanError || !artisanProfile) {
      console.error("Could not load artisan profile:", artisanError);
      setError("تعذر تحميل بيانات الحرفي.");
      setLoading(false);
      return;
    }

    const { data, error: productsError } = await supabase
      .from("products")
      .select(
        "id, slug, name_en, name_ar, description_en, description_ar, story_en, story_ar, material_en, material_ar, price, lifecycle_status, quantity, made_to_order, one_of_a_kind, customization"
      )
      .eq("artisan_id", artisanProfile.id)
      .order("created_at", { ascending: false });

    if (productsError) {
      console.error("Could not load artisan products:", productsError);
      setError("تعذر تحميل المنتجات.");
      setLoading(false);
      return;
    }

    const artisanProducts = (data ?? []) as ArtisanProduct[];
    setProducts(artisanProducts);

    const productIds = artisanProducts.map((product) => product.id);

    if (productIds.length === 0) {
      setLatestReviewByProductId({});
      setLoading(false);
      return;
    }

    const { data: reviewRows, error: reviewError } = await supabase
      .from("moderation_requests")
      .select(
        "id, subject_id, status, admin_note, submitted_at, reviewed_at"
      )
      .eq("subject_type", "product")
      .eq("action", "publish")
      .in("subject_id", productIds)
      .order("submitted_at", { ascending: false });

    if (reviewError) {
      console.error("Could not load moderation requests:", reviewError);
      setError("تعذر تحميل حالة مراجعة المنتجات.");
      setLoading(false);
      return;
    }

    const latestByProduct: Record<string, ModerationRequest> = {};

    for (const request of (reviewRows ?? []) as ModerationRequest[]) {
      if (!latestByProduct[request.subject_id]) {
        latestByProduct[request.subject_id] = request;
      }
    }

    setLatestReviewByProductId(latestByProduct);
    setLoading(false);
  };

  const loadProductMedia = async (productId: string) => {
    if (mediaByProductId[productId]) {
      return;
    }

    setMediaLoadingProductId(productId);

    try {
      const response = await fetch(`/api/products/${productId}/media`);

      if (!response.ok) {
        throw new Error("Could not load media");
      }

      const result = await response.json();

      setMediaByProductId((current) => ({
        ...current,
        [productId]: result.media ?? [],
      }));
    } catch (mediaError) {
      console.error("Could not load product media:", mediaError);
      setError("تعذر تحميل صور وفيديو المنتج.");
    } finally {
      setMediaLoadingProductId(null);
    }
  };

  const toggleProductDetails = async (productId: string) => {
    if (expandedProductId === productId) {
      setExpandedProductId(null);
      return;
    }

    setExpandedProductId(productId);
    await loadProductMedia(productId);
  };

  const handleSubmitForReview = async (productId: string) => {
    const currentReview = latestReviewByProductId[productId];

    if (currentReview?.status === "pending") {
      return;
    }

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

    const { data: newRequest, error: submitError } = await supabase
      .from("moderation_requests")
      .insert({
        subject_type: "product",
        subject_id: productId,
        action: "publish",
        status: "pending",
        requested_by: user.id,
      })
      .select(
        "id, subject_id, status, admin_note, submitted_at, reviewed_at"
      )
      .single();

    if (submitError) {
      console.error("Could not submit product for review:", submitError);

      if (submitError.code === "23505") {
        setError("هذا المنتج مُرسل للمراجعة بالفعل.");
        await loadProducts();
      } else {
        setError("تعذر إرسال المنتج للمراجعة.");
      }

      setSubmittingProductId(null);
      return;
    }

    setLatestReviewByProductId((current) => ({
      ...current,
      [productId]: newRequest as ModerationRequest,
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
          <p className="text-[var(--text-secondary)]">
            جاري تحميل المنتجات...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-4 py-10 sm:px-6 md:py-16">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Artisan Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl font-normal text-[var(--color-espresso)]">
              🛍️ إدارة المنتجات
            </h1>
            <p className="text-[var(--text-secondary)]">
              منتجاتك وحالة مراجعتها على IRTH
            </p>
          </div>

          <Link
            href="/artisan/products/new"
            className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-3 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
          >
            + إضافة منتج جديد
          </Link>
        </div>

        {successMessage && (
          <div className="mt-8 rounded-[var(--radius-md)] border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!error && products.length === 0 && (
          <div className="mt-16 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              لا توجد منتجات حالياً
            </p>
          </div>
        )}

        {products.length > 0 && (
          <div className="mt-8 space-y-5">
            {products.map((product) => {
              const review = latestReviewByProductId[product.id];
              const isPending = review?.status === "pending";
              const isRejected = review?.status === "rejected";
              const isPublished = product.lifecycle_status === "published";
              const isDraft = product.lifecycle_status === "draft";
              const isSubmitting = submittingProductId === product.id;
              const isExpanded = expandedProductId === product.id;
              const media = mediaByProductId[product.id] ?? [];
              const coverImage = media.find(
                (item) => item.media_type === "image"
              );

              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]"
                >
                  <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                    <div className="min-h-48 bg-[var(--surface-muted)]">
                      {coverImage ? (
                        <img
                          src={coverImage.signedUrl}
                          alt={product.name_en || product.name_ar}
                          className="h-full min-h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-48 items-center justify-center px-4 text-center text-sm text-[var(--text-muted)]">
                          {mediaLoadingProductId === product.id
                            ? "جاري تحميل الصورة..."
                            : "افتح التفاصيل لعرض الصور والفيديو"}
                        </div>
                      )}
                    </div>

                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                              {product.name_ar || product.name_en}
                            </h2>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                isPublished
                                  ? "bg-green-100 text-green-700"
                                  : isPending
                                  ? "bg-blue-100 text-blue-700"
                                  : isRejected
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {isPublished
                                ? "منشور"
                                : isPending
                                ? "قيد المراجعة"
                                : isRejected
                                ? "مرفوض - يحتاج تعديل"
                                : "مسودة"}
                            </span>
                          </div>

                          {product.name_ar && product.name_en && (
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                              {product.name_en}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--text-secondary)]">
                            <span>
                              السعر: <strong>${product.price}</strong>
                            </span>
                            <span>
                              الكمية: <strong>{product.quantity}</strong>
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {product.made_to_order && (
                              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--text-muted)]">
                                يصنع حسب الطلب
                              </span>
                            )}
                            {product.one_of_a_kind && (
                              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--text-muted)]">
                                قطعة فريدة
                              </span>
                            )}
                            {product.customization && (
                              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--text-muted)]">
                                قابل للتخصيص
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleProductDetails(product.id)}
                          className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
                        >
                          {isExpanded ? "إغلاق التفاصيل" : "عرض التفاصيل"}
                        </button>
                      </div>

                      {isRejected && review?.admin_note && (
                        <div className="mt-5 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4">
                          <p className="text-sm font-medium text-red-700">
                            سبب الرفض من IRTH
                          </p>
                          <p className="mt-1 text-sm leading-6 text-red-700">
                            {review.admin_note}
                          </p>
                        </div>
                      )}

                      {isDraft && (
                        <div className="mt-5">
                          {isPending ? (
                            <button
                              type="button"
                              disabled
                              className="w-full cursor-not-allowed rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium text-[var(--text-muted)] sm:w-auto"
                            >
                              قيد المراجعة
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleSubmitForReview(product.id)}
                              className="w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-5 py-3 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-[var(--border-soft)] p-5 sm:p-6">
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-5">
                          <section>
                            <h3 className="font-medium text-[var(--color-espresso)]">
                              الوصف
                            </h3>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                              {product.description_ar ||
                                product.description_en ||
                                "لا يوجد وصف."}
                            </p>
                          </section>

                          <section>
                            <h3 className="font-medium text-[var(--color-espresso)]">
                              القصة
                            </h3>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                              {product.story_ar ||
                                product.story_en ||
                                "لا توجد قصة."}
                            </p>
                          </section>

                          <section>
                            <h3 className="font-medium text-[var(--color-espresso)]">
                              الخامة
                            </h3>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                              {product.material_ar ||
                                product.material_en ||
                                "غير محددة"}
                            </p>
                          </section>
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
                              {media.map((mediaItem) =>
                                mediaItem.media_type === "image" ? (
                                  <img
                                    key={mediaItem.id}
                                    src={mediaItem.signedUrl}
                                    alt={product.name_en || product.name_ar}
                                    className="h-40 w-full rounded-[var(--radius-md)] object-cover"
                                  />
                                ) : (
                                  <video
                                    key={mediaItem.id}
                                    src={mediaItem.signedUrl}
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

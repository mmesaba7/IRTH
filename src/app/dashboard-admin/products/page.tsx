"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ReviewStatus = "pending" | "approved" | "rejected";

type ModerationRequest = {
  id: string;
  subject_id: string;
  status: ReviewStatus;
  admin_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

type Product = {
  id: string;
  slug: string;
  artisan_id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  story_ar: string | null;
  story_en: string | null;
  material_ar: string | null;
  material_en: string | null;
  price: number;
  quantity: number;
  lifecycle_status: string;
  made_to_order: boolean;
  one_of_a_kind: boolean;
  customization: boolean;
};

type Artisan = {
  id: string;
  name_ar: string;
  name_en: string;
};

type ProductMedia = {
  id: string;
  media_type: "image" | "video";
  sort_order: number;
  signedUrl: string;
};

type ReviewItem = {
  request: ModerationRequest;
  product: Product;
  artisan: Artisan | null;
};

export default function AdminProductsPage() {
  const router = useRouter();

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [filter, setFilter] = useState<"all" | ReviewStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(
    null
  );
  const [mediaByProductId, setMediaByProductId] = useState<
    Record<string, ProductMedia[]>
  >({});
  const [mediaLoadingProductId, setMediaLoadingProductId] = useState<
    string | null
  >(null);

  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(
    null
  );

  const loadReviewItems = useCallback(async () => {
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

    const { data: requests, error: requestsError } = await supabase
      .from("moderation_requests")
      .select(
        "id, subject_id, status, admin_note, submitted_at, reviewed_at"
      )
      .eq("subject_type", "product")
      .eq("action", "publish")
      .order("submitted_at", { ascending: false });

    if (requestsError) {
      console.error("Could not load moderation requests:", requestsError);
      setError("تعذر تحميل طلبات مراجعة المنتجات.");
      setLoading(false);
      return;
    }

    const typedRequests = (requests ?? []) as ModerationRequest[];

    if (typedRequests.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const productIds = typedRequests.map((request) => request.subject_id);

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(
        "id, slug, artisan_id, name_ar, name_en, description_ar, description_en, story_ar, story_en, material_ar, material_en, price, quantity, lifecycle_status, made_to_order, one_of_a_kind, customization"
      )
      .in("id", productIds);

    if (productsError) {
      console.error("Could not load review products:", productsError);
      setError("تعذر تحميل بيانات المنتجات للمراجعة.");
      setLoading(false);
      return;
    }

    const typedProducts = (products ?? []) as Product[];
    const artisanIds = [...new Set(typedProducts.map((product) => product.artisan_id))];

    let artisans: Artisan[] = [];

    if (artisanIds.length > 0) {
      const { data: artisanRows, error: artisansError } = await supabase
        .from("artisan_profiles")
        .select("id, name_ar, name_en")
        .in("id", artisanIds);

      if (artisansError) {
        console.error("Could not load artisans:", artisansError);
        setError("تعذر تحميل بيانات الحرفيين.");
        setLoading(false);
        return;
      }

      artisans = (artisanRows ?? []) as Artisan[];
    }

    const productsById = new Map(
      typedProducts.map((product) => [product.id, product])
    );
    const artisansById = new Map(
      artisans.map((artisan) => [artisan.id, artisan])
    );

    const reviewItems = typedRequests
      .map((request) => {
        const product = productsById.get(request.subject_id);

        if (!product) {
          return null;
        }

        return {
          request,
          product,
          artisan: artisansById.get(product.artisan_id) ?? null,
        };
      })
      .filter((item): item is ReviewItem => item !== null);

    setItems(reviewItems);
    setLoading(false);
  }, [router]);

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

  const toggleReviewDetails = async (item: ReviewItem) => {
    if (expandedRequestId === item.request.id) {
      setExpandedRequestId(null);
      return;
    }

    setExpandedRequestId(item.request.id);
    await loadProductMedia(item.product.id);
  };

  const handleApprove = async (requestId: string) => {
    setReviewingRequestId(requestId);
    setError("");
    setSuccessMessage("");

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/dashboard-admin/login");
      return;
    }

    const { error: reviewError } = await supabase
      .from("moderation_requests")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_note: null,
      })
      .eq("id", requestId)
      .eq("status", "pending");

    if (reviewError) {
      console.error("Could not approve product:", reviewError);
      setError("تعذر اعتماد المنتج.");
      setReviewingRequestId(null);
      return;
    }

    setSuccessMessage("تم اعتماد المنتج ونشره بنجاح.");
    setExpandedRequestId(null);
    setReviewingRequestId(null);
    await loadReviewItems();
  };

  const handleReject = async (requestId: string) => {
    const note = rejectNotes[requestId]?.trim();

    if (!note) {
      setError("اكتب سبب الرفض قبل رفض المنتج.");
      return;
    }

    setReviewingRequestId(requestId);
    setError("");
    setSuccessMessage("");

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/dashboard-admin/login");
      return;
    }

    const { error: reviewError } = await supabase
      .from("moderation_requests")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_note: note,
      })
      .eq("id", requestId)
      .eq("status", "pending");

    if (reviewError) {
      console.error("Could not reject product:", reviewError);
      setError("تعذر رفض المنتج.");
      setReviewingRequestId(null);
      return;
    }

    setSuccessMessage("تم رفض المنتج وتسجيل سبب الرفض.");
    setExpandedRequestId(null);
    setReviewingRequestId(null);
    setRejectNotes((current) => ({
      ...current,
      [requestId]: "",
    }));
    await loadReviewItems();
  };

  useEffect(() => {
    void loadReviewItems();
  }, [loadReviewItems]);

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    return item.request.status === filter;
  });

  const countByStatus = (status: ReviewStatus) =>
    items.filter((item) => item.request.status === status).length;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--text-secondary)]">
          جاري تحميل طلبات المراجعة...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[var(--container-max)] px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Admin Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] sm:text-4xl">
              Product Review
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              مراجعة المنتجات قبل نشرها على IRTH
            </p>
          </div>

          <Link
            href="/dashboard-admin/dashboard"
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
          >
            ← Back to Dashboard
          </Link>
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

        <div className="mt-6 flex flex-wrap gap-2">
          {([
            ["pending", `Pending (${countByStatus("pending")})`],
            ["approved", `Approved (${countByStatus("approved")})`],
            ["rejected", `Rejected (${countByStatus("rejected")})`],
            ["all", `All (${items.length})`],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                filter === value
                  ? "bg-[var(--color-espresso)] text-[var(--color-ivory)]"
                  : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filteredItems.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              لا توجد طلبات في هذه الحالة
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {filteredItems.map((item) => {
              const isExpanded = expandedRequestId === item.request.id;
              const isPending = item.request.status === "pending";
              const isReviewing = reviewingRequestId === item.request.id;
              const media = mediaByProductId[item.product.id] ?? [];

              return (
                <article
                  key={item.request.id}
                  className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                          {item.product.name_ar || item.product.name_en}
                        </h2>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            item.request.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : item.request.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {item.request.status === "approved"
                            ? "Approved"
                            : item.request.status === "rejected"
                            ? "Rejected"
                            : "Pending"}
                        </span>
                      </div>

                      {item.product.name_ar && item.product.name_en && (
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {item.product.name_en}
                        </p>
                      )}

                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Artisan: {item.artisan?.name_en || item.artisan?.name_ar || "Unknown"}
                      </p>

                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        Price: ${item.product.price} · Quantity: {item.product.quantity}
                      </p>

                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Submitted: {new Date(item.request.submitted_at).toLocaleString()}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleReviewDetails(item)}
                      className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
                    >
                      {isExpanded ? "إغلاق التفاصيل" : "مراجعة التفاصيل"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-6 border-t border-[var(--border-soft)] pt-6">
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-5">
                          <section>
                            <h3 className="font-medium text-[var(--color-espresso)]">
                              الوصف
                            </h3>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                              {item.product.description_ar ||
                                item.product.description_en ||
                                "لا يوجد وصف."}
                            </p>
                          </section>

                          <section>
                            <h3 className="font-medium text-[var(--color-espresso)]">
                              القصة
                            </h3>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                              {item.product.story_ar ||
                                item.product.story_en ||
                                "لا توجد قصة."}
                            </p>
                          </section>

                          <section>
                            <h3 className="font-medium text-[var(--color-espresso)]">
                              الخامة
                            </h3>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                              {item.product.material_ar ||
                                item.product.material_en ||
                                "غير محددة"}
                            </p>
                          </section>

                          <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                            {item.product.made_to_order && (
                              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">
                                Made to order
                              </span>
                            )}
                            {item.product.one_of_a_kind && (
                              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">
                                One of a kind
                              </span>
                            )}
                            {item.product.customization && (
                              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">
                                Customizable
                              </span>
                            )}
                          </div>
                        </div>

                        <section>
                          <h3 className="font-medium text-[var(--color-espresso)]">
                            الصور والفيديو
                          </h3>

                          {mediaLoadingProductId === item.product.id ? (
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
                                    alt={item.product.name_en}
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

                      {item.request.status === "rejected" && item.request.admin_note && (
                        <div className="mt-6 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                          <strong>سبب الرفض:</strong> {item.request.admin_note}
                        </div>
                      )}

                      {isPending && (
                        <div className="mt-6 border-t border-[var(--border-soft)] pt-6">
                          <label className="block text-sm font-medium text-[var(--color-espresso)]">
                            سبب الرفض
                          </label>
                          <textarea
                            value={rejectNotes[item.request.id] ?? ""}
                            onChange={(event) =>
                              setRejectNotes((current) => ({
                                ...current,
                                [item.request.id]: event.target.value,
                              }))
                            }
                            rows={3}
                            placeholder="مطلوب فقط عند رفض المنتج"
                            className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                          />

                          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <button
                              type="button"
                              disabled={isReviewing}
                              onClick={() => handleApprove(item.request.id)}
                              className="rounded-[var(--radius-md)] bg-green-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isReviewing ? "جاري التنفيذ..." : "Approve & Publish"}
                            </button>

                            <button
                              type="button"
                              disabled={isReviewing}
                              onClick={() => handleReject(item.request.id)}
                              className="rounded-[var(--radius-md)] bg-red-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isReviewing ? "جاري التنفيذ..." : "Reject"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

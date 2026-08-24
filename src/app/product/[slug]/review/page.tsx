"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../../components/Header";
import { canReviewOrder, saveReview } from "@/lib/reviewUtils";
import { Order, Review, Rating } from "@/types";

export default function ProductReviewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [productRating, setProductRating] = useState<Rating>(5);
  const [artisanRating, setArtisanRating] = useState<Rating>(5);
  const [reviewText, setReviewText] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const orders: Order[] = JSON.parse(
      localStorage.getItem("irth-orders") || "[]"
    );
    const eligibleOrder = orders.find(
      (o) =>
        o.status === "تم التسليم" &&
        !o.reviewed &&
        o.items.some((item) => item.slug === slug)
    );

    if (!eligibleOrder) {
      setError("لا يمكنك تقييم هذا المنتج. قد يكون طلبك لم يسلم بعد، أو قمت بالتقييم مسبقاً.");
      setLoading(false);
      return;
    }

    setOrder(eligibleOrder);
    setLoading(false);
  }, [slug]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const productItem = order.items.find((item) => item.slug === slug);
    if (!productItem) {
      setError("المنتج غير موجود في هذا الطلب");
      return;
    }

    const newReview: Review = {
      id: `review-${Date.now()}`,
      orderId: order.id,
      productSlug: slug,
      productName: productItem.name,
      artisanName: productItem.artisan,
      customerName: order.customer.name,
      productRating,
      artisanRating,
      reviewText,
      images: images.map((img) => img.name),
      status: "published",
      editCount: 0,
      createdAt: new Date().toISOString(),
    };

    saveReview(newReview);
    router.push(`/product/${slug}?review=success`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري التحميل...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        <h1 className="font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
          تقييم المنتج
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          شارك تجربتك مع المنتج والحرفي
        </p>

        {error ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-red-50 p-6 text-red-600">
            {error}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* تقييم المنتج */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                تقييم المنتج
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setProductRating(star as Rating)}
                    className={`text-3xl transition ${
                      star <= productRating
                        ? "text-[var(--color-copper)]"
                        : "text-[var(--border-soft)]"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* تقييم الحرفي */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                تقييم الحرفي
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setArtisanRating(star as Rating)}
                    className={`text-3xl transition ${
                      star <= artisanRating
                        ? "text-[var(--color-copper)]"
                        : "text-[var(--border-soft)]"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* المراجعة النصية */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                المراجعة النصية
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="اكتب تجربتك مع المنتج والحرفي..."
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                rows={5}
                required
              />
            </div>

            {/* رفع الصور (اختياري) */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                صور (اختياري)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setImages(Array.from(e.target.files || []))}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
            >
              نشر التقييم
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
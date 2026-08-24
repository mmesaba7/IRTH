"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../../../components/Header"; // ← عدلنا المسار (ضفنا نقطة)
import { getReviews, updateReview } from "@/lib/reviewUtils";
import { Review, Rating } from "@/types";

export default function EditReviewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<Review | null>(null);
  const [productRating, setProductRating] = useState<Rating>(5);
  const [artisanRating, setArtisanRating] = useState<Rating>(5);
  const [reviewText, setReviewText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const allReviews = getReviews();
    const existingReview = allReviews.find(
      (r) => r.productSlug === slug && r.editCount === 0
    );

    if (!existingReview) {
      setError("لا يمكنك تعديل هذا التقييم. قد تكون قمت بالتعديل مسبقاً.");
      setLoading(false);
      return;
    }

    setReview(existingReview);
    setProductRating(existingReview.productRating as Rating);
    setArtisanRating(existingReview.artisanRating as Rating);
    setReviewText(existingReview.reviewText);
    setLoading(false);
  }, [slug]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!review) return;

    const updated = updateReview(review.id, {
      productRating,
      artisanRating,
      reviewText,
      status: "edited",
    });

    if (updated) {
      setSuccess(true);
      setTimeout(() => {
        router.push(`/product/${slug}`);
      }, 1500);
    } else {
      setError("حدث خطأ أثناء التعديل. تأكد من أنك لم تعدل هذا التقييم من قبل.");
    }
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

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <section className="mx-auto max-w-2xl px-6 py-16 md:py-24">
          <div className="rounded-[var(--radius-lg)] bg-red-50 p-6 text-red-600">
            <p className="font-medium">❌ {error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 text-sm text-[var(--color-copper)] hover:underline"
            >
              ← العودة للخلف
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <section className="mx-auto max-w-2xl px-6 py-16 md:py-24">
          <div className="rounded-[var(--radius-lg)] bg-green-50 p-6 text-center text-green-700">
            <p className="text-2xl">✅</p>
            <p className="mt-2 font-medium">تم تعديل التقييم بنجاح</p>
            <p className="mt-1 text-sm">جاري التحويل إلى صفحة المنتج...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        <h1 className="font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
          تعديل التقييم
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          يمكنك تعديل تقييمك **مرة واحدة فقط**
        </p>

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
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              rows={5}
              required
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
            >
              حفظ التعديلات
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--border-soft)] px-6 py-4 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
            >
              إلغاء
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
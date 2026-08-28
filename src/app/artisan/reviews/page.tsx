"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { getArtisanReviews, addArtisanReply } from "../../../lib/reviewUtils";
import { Review } from "@/types";
import { createClient } from "@/lib/supabase/client";

export default function ArtisanReviewsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const artisanName = "Ahmed Hassan"; // مؤقت، هنربط بالحساب لاحقاً

  useEffect(() => {

    const artisanReviews = getArtisanReviews(artisanName);
    setReviews(artisanReviews);
    setLoading(false);
  }, [router]);

  const handleReply = (reviewId: string) => {
    if (!replyText.trim()) {
      setMessage("❌ من فضلك اكتب الرد أولاً");
      return;
    }

    const success = addArtisanReply(reviewId, replyText, artisanName);
    if (success) {
      setMessage("✅ تم إرسال الرد للمراجعة");
      setReplyText("");
      setReplyingTo(null);
      // تحديث القائمة
      const updated = getArtisanReviews(artisanName);
      setReviews(updated);
    } else {
      setMessage("❌ حدث خطأ أثناء إرسال الرد");
    }

    setTimeout(() => setMessage(""), 3000);
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

      <section className="mx-auto max-w-4xl px-6 py-10 md:py-16">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Artisan Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              📝 ردود على التقييمات
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              شوف تقييمات منتجاتك وأضف ردود عليها
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
  await supabase.auth.signOut({ scope: "local" });
  router.replace("/artisan/login");
  router.refresh();
}}
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
          >
            Logout
          </button>
        </div>

        {message && (
          <div className="mt-4 rounded-[var(--radius-md)] bg-blue-50 p-3 text-sm text-blue-700">
            {message}
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="mt-16 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              🎉 مفيش تقييمات على منتجاتك
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-[var(--color-espresso)]">
                      {review.customerName}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-[var(--color-copper)]">
                          {'★'.repeat(review.productRating)}
                          {'☆'.repeat(5 - review.productRating)}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(review.createdAt).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">
                      {review.reviewText}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      المنتج: {review.productName}
                    </p>
                  </div>
                </div>

                {/* عرض الرد الحالي لو موجود */}
                {review.artisanReply && (
                  <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4">
                    <p className="text-xs font-medium text-[var(--color-copper)]">
                      رد الحرفي:
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {review.artisanReply.text}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {review.artisanReply.status === "pending_review"
                        ? "⏳ قيد المراجعة"
                        : review.artisanReply.status === "approved"
                        ? "✅ معتمد"
                        : "❌ مرفوض"}
                    </p>
                  </div>
                )}

                {/* زر الرد و نموذج الرد */}
                {!review.artisanReply && (
                  <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
                    {replyingTo === review.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="اكتب ردك على التقييم..."
                          className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReply(review.id)}
                            className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-4 py-2 text-sm text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
                          >
                            إرسال الرد
                          </button>
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText("");
                            }}
                            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReplyingTo(review.id)}
                        className="text-sm text-[var(--color-copper)] hover:underline"
                      >
                        رد على التقييم
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}


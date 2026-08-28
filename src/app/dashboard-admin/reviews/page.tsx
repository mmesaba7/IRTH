"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import Link from "next/link";
import { getPendingArtisanReplies, reviewArtisanReply } from "../../../lib/reviewUtils";
import { Review } from "@/types";

export default function AdminReviewRepliesPage() {
  const router = useRouter();
  const [pendingReplies, setPendingReplies] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {

    const pending = getPendingArtisanReplies();
    setPendingReplies(pending);
    setLoading(false);
  }, [router]);

  const handleReview = (reviewId: string, action: "approve" | "reject") => {
    const success = reviewArtisanReply(reviewId, action);
    if (success) {
      setMessage(
        `✅ تم ${action === "approve" ? "اعتماد" : "رفض"} الرد بنجاح`
      );
      // تحديث القائمة
      const pending = getPendingArtisanReplies();
      setPendingReplies(pending);
    } else {
      setMessage("❌ حدث خطأ أثناء المراجعة");
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
              Admin Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              📝 مراجعة ردود الحرفيين
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              وافق أو ارفض ردود الحرفيين على التقييمات
            </p>
          </div>
          <Link
            href="/dashboard-admin/dashboard"
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {message && (
          <div className="mt-4 rounded-[var(--radius-md)] bg-blue-50 p-3 text-sm text-blue-700">
            {message}
          </div>
        )}

        {pendingReplies.length === 0 ? (
          <div className="mt-16 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              🎉 مفيش ردود في انتظار المراجعة
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {pendingReplies.map((review) => (
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
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {review.reviewText}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      المنتج: {review.productName} · الحرفي: {review.artisanName}
                    </p>
                  </div>
                </div>

                {/* رد الحرفي */}
                {review.artisanReply && (
                  <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4">
                    <p className="text-xs font-medium text-[var(--color-copper)]">
                      رد الحرفي (قيد المراجعة):
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {review.artisanReply.text}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {new Date(review.artisanReply.createdAt).toLocaleString("ar-EG")}
                    </p>
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => handleReview(review.id, "approve")}
                        className="rounded-[var(--radius-md)] bg-green-600 px-6 py-2 text-sm text-white transition hover:bg-green-700"
                      >
                        ✅ اعتماد الرد
                      </button>
                      <button
                        onClick={() => handleReview(review.id, "reject")}
                        className="rounded-[var(--radius-md)] bg-red-500 px-6 py-2 text-sm text-white transition hover:bg-red-600"
                      >
                        ❌ رفض الرد
                      </button>
                    </div>
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

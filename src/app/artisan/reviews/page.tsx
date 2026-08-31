"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";

type ArtisanReview = {
  reviewId: string;
  productSlug: string;
  productNameAr: string | null;
  productNameEn: string;
  productRating: number;
  artisanRating: number;
  reviewText: string;
  createdAt: string;
  edited: boolean;
  reply: null | {
    id: string;
    text: string;
    status: string;
    moderationNote: string | null;
    createdAt: string;
  };
};

export default function ArtisanReviewsPage() {
  const [reviews, setReviews] = useState<ArtisanReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/artisan/reviews", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "تعذر تحميل التقييمات.");
      setReviews(Array.isArray(body?.reviews) ? body.reviews : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل التقييمات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function submitReply(reviewId: string) {
    if (!replyText.trim() || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/artisan/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, replyText }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "تعذر إرسال الرد.");
      setReplyText("");
      setReplyingTo(null);
      setMessage("تم إرسال الرد إلى IRTH للمراجعة. لن يظهر للعميل قبل الموافقة.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر إرسال الرد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-4xl px-6 py-10 md:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Artisan Panel</p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">التقييمات</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">تقييمات شراء حقيقية منشورة بعد مراجعة IRTH. بيانات التواصل الخاصة بالعميل لا تظهر هنا.</p>
          </div>
          <Link href="/artisan/dashboard" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)]">← Dashboard</Link>
        </div>

        {message && <div className="mt-5 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-5 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {loading ? (
          <p className="mt-10 text-[var(--text-secondary)]">جاري التحميل...</p>
        ) : reviews.length === 0 ? (
          <div className="mt-12 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-8 text-center text-[var(--text-secondary)]">لا توجد تقييمات منشورة على منتجاتك حتى الآن.</div>
        ) : (
          <div className="mt-8 space-y-5">
            {reviews.map((review) => (
              <article key={review.reviewId} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-olive)]">Verified Purchase</p>
                    <p className="mt-2 font-medium text-[var(--color-espresso)]">{review.productNameAr || review.productNameEn}</p>
                    <p className="mt-2 text-sm text-[var(--color-copper)]">المنتج {'★'.repeat(review.productRating)}{'☆'.repeat(5 - review.productRating)} · الحرفي {'★'.repeat(review.artisanRating)}{'☆'.repeat(5 - review.artisanRating)}</p>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(review.createdAt).toLocaleDateString("ar-EG")}{review.edited ? " · تم تعديله" : ""}</p>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{review.reviewText}</p>

                {review.reply ? (
                  <div className="mt-5 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4">
                    <p className="text-xs font-medium text-[var(--color-copper)]">ردك</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{review.reply.text}</p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">الحالة: {review.reply.status.replaceAll("_", " ")}{review.reply.moderationNote ? ` · ${review.reply.moderationNote}` : ""}</p>
                  </div>
                ) : replyingTo === review.reviewId ? (
                  <div className="mt-5 border-t border-[var(--border-soft)] pt-5">
                    <textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} maxLength={3000} rows={4} className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]" placeholder="اكتب ردك..." />
                    <div className="mt-3 flex gap-2">
                      <button type="button" disabled={saving} onClick={() => void submitReply(review.reviewId)} className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-4 py-2 text-sm text-[var(--color-ivory)] disabled:opacity-50">{saving ? "جاري الإرسال..." : "إرسال للمراجعة"}</button>
                      <button type="button" onClick={() => { setReplyingTo(null); setReplyText(""); }} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-secondary)]">إلغاء</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setReplyingTo(review.reviewId); setReplyText(""); }} className="mt-5 text-sm font-medium text-[var(--color-copper)] hover:underline">رد على التقييم →</button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

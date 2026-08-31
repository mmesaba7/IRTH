"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";

type PendingReview = {
  id: string;
  productNameAr: string | null;
  productNameEn: string;
  artisanName: string;
  productRating: number;
  artisanRating: number;
  reviewText: string;
  editCount: number;
  createdAt: string;
};

type PendingReply = {
  id: string;
  reviewId: string;
  productNameAr: string | null;
  productNameEn: string;
  artisanName: string;
  reviewText: string;
  replyText: string;
  createdAt: string;
};

type PendingMedia = {
  id: string;
  reviewId: string;
  mimeType: string;
  byteSize: number;
  sortOrder: number;
  signedUrl: string | null;
};

type ModerationTarget = "review" | "reply" | "media";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [replies, setReplies] = useState<PendingReply[]>([]);
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/reviews", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to load review queue.");
      setReviews(Array.isArray(body?.reviews) ? body.reviews : []);
      setReplies(Array.isArray(body?.replies) ? body.replies : []);
      setMedia(Array.isArray(body?.media) ? body.media : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load review queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function decide(target: ModerationTarget, id: string, decision: "approved" | "rejected") {
    if (working) return;
    setWorking(`${target}:${id}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, id, decision }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to save moderation decision.");
      setMessage(decision === "approved" ? "تم الاعتماد." : "تم الرفض.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save moderation decision.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-5xl px-6 py-10 md:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Admin Panel</p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Review Moderation</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Customer review text, customer images, and Artisan replies are moderated independently by IRTH.</p>
          </div>
          <Link href="/dashboard-admin/dashboard" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)]">← Dashboard</Link>
        </div>

        {message && <div className="mt-5 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-5 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {loading ? (
          <p className="mt-10 text-[var(--text-secondary)]">Loading moderation queue…</p>
        ) : (
          <div className="mt-8 space-y-10">
            <section>
              <div className="flex items-center justify-between">
                <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Customer Reviews</h2>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs">{reviews.length} pending</span>
              </div>
              {reviews.length === 0 ? (
                <Empty>No customer reviews pending moderation.</Empty>
              ) : (
                <div className="mt-4 space-y-4">
                  {reviews.map((review) => (
                    <article key={review.id} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-olive)]">Verified Purchase · {review.editCount ? "Edited once" : "Original submission"}</p>
                      <p className="mt-2 font-medium text-[var(--color-espresso)]">{review.productNameAr || review.productNameEn} · {review.artisanName}</p>
                      <p className="mt-2 text-sm text-[var(--color-copper)]">Product {'★'.repeat(review.productRating)} · Artisan {'★'.repeat(review.artisanRating)}</p>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{review.reviewText}</p>
                      <DecisionButtons working={working} approve={() => void decide("review", review.id, "approved")} reject={() => void decide("review", review.id, "rejected")} />
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="border-t border-[var(--border-soft)] pt-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Customer Review Images</h2>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">Private images remain invisible on the Product page until individually approved.</p>
                </div>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs">{media.length} pending</span>
              </div>
              {media.length === 0 ? (
                <Empty>No review images pending moderation.</Empty>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {media.map((image) => (
                    <article key={image.id} className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
                      {image.signedUrl ? <img src={image.signedUrl} alt="Pending customer review" className="aspect-square w-full object-cover" referrerPolicy="no-referrer" /> : <div className="aspect-square bg-[var(--surface-muted)]" />}
                      <div className="p-4">
                        <p className="text-xs text-[var(--text-muted)]">Review {image.reviewId.slice(0, 8)}… · {(Number(image.byteSize) / 1024 / 1024).toFixed(2)} MB</p>
                        <DecisionButtons working={working} approve={() => void decide("media", image.id, "approved")} reject={() => void decide("media", image.id, "rejected")} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="border-t border-[var(--border-soft)] pt-8">
              <div className="flex items-center justify-between">
                <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Artisan Replies</h2>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs">{replies.length} pending</span>
              </div>
              {replies.length === 0 ? (
                <Empty>No Artisan replies pending moderation.</Empty>
              ) : (
                <div className="mt-4 space-y-4">
                  {replies.map((reply) => (
                    <article key={reply.id} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
                      <p className="font-medium text-[var(--color-espresso)]">{reply.productNameAr || reply.productNameEn} · {reply.artisanName}</p>
                      <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4">
                        <p className="text-xs font-medium text-[var(--text-muted)]">Customer review</p>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">{reply.reviewText}</p>
                      </div>
                      <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--border-soft)] p-4">
                        <p className="text-xs font-medium text-[var(--color-copper)]">Artisan reply</p>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">{reply.replyText}</p>
                      </div>
                      <DecisionButtons working={working} approve={() => void decide("reply", reply.id, "approved")} reject={() => void decide("reply", reply.id, "rejected")} />
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-6 text-sm text-[var(--text-secondary)]">{children}</div>;
}

function DecisionButtons({ working, approve, reject }: { working: string | null; approve: () => void; reject: () => void }) {
  return (
    <div className="mt-5 flex gap-3 border-t border-[var(--border-soft)] pt-4">
      <button disabled={Boolean(working)} onClick={approve} className="rounded-[var(--radius-md)] bg-green-700 px-5 py-2 text-sm text-white disabled:opacity-50">Approve</button>
      <button disabled={Boolean(working)} onClick={reject} className="rounded-[var(--radius-md)] bg-red-600 px-5 py-2 text-sm text-white disabled:opacity-50">Reject</button>
    </div>
  );
}

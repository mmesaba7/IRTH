"use client";

import { useEffect, useMemo, useState } from "react";

type PublishedReview = {
  review_id: string;
  product_rating: number;
  artisan_rating: number;
  review_text: string;
  created_at: string;
  edited: boolean;
  reply_text: string | null;
  reply_created_at: string | null;
  images: Array<{ id: string; url: string }>;
};

export default function ProductReviews({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<PublishedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reviews/product/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || "Unable to load reviews.");
        setReviews(Array.isArray(body?.reviews) ? body.reviews : []);
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load reviews.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug]);

  const summary = useMemo(() => {
    if (reviews.length === 0) return null;
    return {
      product: reviews.reduce((sum, item) => sum + item.product_rating, 0) / reviews.length,
      artisan: reviews.reduce((sum, item) => sum + item.artisan_rating, 0) / reviews.length,
    };
  }, [reviews]);

  return (
    <section className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6">
      <div className="flex flex-col gap-3 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-eyebrow">Verified Reviews</p>
          <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)]">Customer Reviews</h2>
        </div>
        {summary && (
          <p className="text-sm text-[var(--text-secondary)]">
            Product {summary.product.toFixed(1)} ★ · Artisan {summary.artisan.toFixed(1)} ★ · {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-[var(--text-secondary)]">Loading reviews…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-[var(--color-terracotta)]">{error}</p>
      ) : reviews.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--text-secondary)]">No published verified-purchase reviews yet.</p>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {reviews.map((review) => (
            <article key={review.review_id} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-olive)]">Verified Purchase</p>
              <p className="mt-3 text-sm text-[var(--color-copper)]">
                Product {'★'.repeat(review.product_rating)}{'☆'.repeat(5 - review.product_rating)} · Artisan {'★'.repeat(review.artisan_rating)}{'☆'.repeat(5 - review.artisan_rating)}
              </p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{review.review_text}</p>
              {review.images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {review.images.map((image) => (
                    <img key={image.id} src={image.url} alt="Customer review" className="aspect-square w-full rounded-[var(--radius-md)] object-cover" loading="lazy" referrerPolicy="no-referrer" />
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-[var(--text-muted)]">{new Date(review.created_at).toLocaleDateString("en-GB")}{review.edited ? " · edited once" : ""}</p>
              {review.reply_text && (
                <div className="mt-5 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4">
                  <p className="text-xs font-medium text-[var(--color-copper)]">Artisan reply · approved by IRTH</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{review.reply_text}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

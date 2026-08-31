"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import Header from "../../../components/Header";

type ReviewContext = {
  orderItemId: string;
  orderNumber: string;
  productSlug: string;
  productNameAr: string | null;
  productNameEn: string;
  quantity: number;
  deliveredAt: string | null;
  eligible: boolean;
  review: null | {
    id: string;
    productRating: number;
    artisanRating: number;
    reviewText: string;
    status: string;
    editCount: number;
  };
};

export default function ProductReviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = String(params.slug ?? "");
  const orderItemId = searchParams.get("orderItemId") ?? "";

  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [credentialReady, setCredentialReady] = useState(false);
  const [context, setContext] = useState<ReviewContext | null>(null);
  const [productRating, setProductRating] = useState(5);
  const [artisanRating, setArtisanRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const token = fragment.get("access")?.trim() ?? "";
    if (/^[A-Za-z0-9_-]{43}$/.test(token)) setGuestToken(token);
    if (window.location.hash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    setCredentialReady(true);
  }, []);

  useEffect(() => {
    if (!credentialReady) return;
    const controller = new AbortController();
    if (!orderItemId) {
      setError("افتح التقييم من الطلب الذي تم تسليمه حتى نربطه بعملية الشراء الصحيحة.");
      setLoading(false);
      return () => controller.abort();
    }

    const query = new URLSearchParams({ orderItemId });
    if (guestToken) query.set("guestToken", guestToken);

    fetch(`/api/reviews/customer?${query.toString()}`, {
      cache: "no-store",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || "تعذر تحميل التقييم.");
        const next = body.context as ReviewContext;
        if (next.productSlug !== slug) throw new Error("هذا الشراء لا يخص المنتج المطلوب.");
        setContext(next);
        if (next.review) {
          setProductRating(next.review.productRating);
          setArtisanRating(next.review.artisanRating);
          setReviewText(next.review.reviewText);
        }
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "تعذر تحميل التقييم.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [credentialReady, guestToken, orderItemId, slug]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context || saving) return;

    const editing = Boolean(context.review);
    if (editing && (context.review?.editCount ?? 0) >= 1) {
      setError("تم استخدام التعديل الوحيد المسموح لهذا التقييم.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/reviews/customer", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({
          ...(editing ? { reviewId: context.review?.id } : { orderItemId: context.orderItemId }),
          productRating,
          artisanRating,
          reviewText,
          guestToken,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "تعذر حفظ التقييم.");
      setMessage(editing
        ? "تم إرسال التعديل إلى IRTH للمراجعة. هذا هو التعديل الوحيد المسموح لهذا الشراء."
        : "تم إرسال التقييم إلى IRTH للمراجعة. سيظهر للعامة بعد الموافقة.");
      setContext((current) => current ? {
        ...current,
        review: {
          id: String(body.reviewId),
          productRating,
          artisanRating,
          reviewText,
          status: "pending_review",
          editCount: editing ? 1 : 0,
        },
      } : current);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر حفظ التقييم.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[var(--background)]"><Header /><div className="flex h-96 items-center justify-center text-[var(--text-secondary)]">جاري التحقق من الشراء...</div></main>;
  }

  const canEdit = Boolean(context?.review) && (context?.review?.editCount ?? 0) === 0;
  const canSubmit = Boolean(context?.eligible) && (!context?.review || canEdit);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-2xl px-6 py-12 md:py-20">
        <Link href="/account/orders" className="text-sm text-[var(--color-copper)] hover:underline">← رجوع لطلباتي</Link>
        <p className="mt-8 text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Verified Purchase</p>
        <h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">تقييم المنتج والحرفي</h1>

        {context && (
          <div className="mt-5 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
            <strong>{context.productNameAr || context.productNameEn}</strong> · الطلب {context.orderNumber} · الكمية {context.quantity}
          </div>
        )}

        {message && <div className="mt-6 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-6 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {context?.review && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--border-soft)] p-4 text-sm text-[var(--text-secondary)]">
            الحالة الحالية: <strong>{context.review.status.replaceAll("_", " ")}</strong>. {context.review.editCount === 0 ? "يمكنك تعديل هذا التقييم مرة واحدة فقط." : "تم استخدام التعديل الوحيد المسموح."}
          </div>
        )}

        {canSubmit && (
          <form onSubmit={submit} className="mt-8 space-y-6">
            <RatingField label="تقييم المنتج" value={productRating} onChange={setProductRating} />
            <RatingField label="تقييم الحرفي" value={artisanRating} onChange={setArtisanRating} />
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">المراجعة النصية</label>
              <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} maxLength={4000} required rows={6} className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]" placeholder="احكي تجربتك الحقيقية مع المنتج والحرفي..." />
            </div>
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-xs leading-6 text-[var(--text-secondary)]">
              التقييم لا يُنشر فورًا؛ يمر بمراجعة IRTH أولًا. رفع الصور سيتم تفعيله بعد اعتماد حدود الملفات والصور الآمنة، لذلك لا نخزن أسماء ملفات وهمية أو صورًا غير محمية في هذه المرحلة.
            </div>
            <button disabled={saving} className="w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] hover:bg-[var(--color-copper)] disabled:opacity-50">
              {saving ? "جاري الإرسال..." : context.review ? "إرسال التعديل للمراجعة" : "إرسال التقييم للمراجعة"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function RatingField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[var(--color-espresso)]">{label}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" onClick={() => onChange(star)} aria-label={`${star} stars`} className={`text-3xl ${star <= value ? "text-[var(--color-copper)]" : "text-[var(--border-soft)]"}`}>★</button>
        ))}
      </div>
    </div>
  );
}

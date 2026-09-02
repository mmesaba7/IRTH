"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function ArtisanProductEditLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [productId, setProductId] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState(false);
  const [loadingAction, setLoadingAction] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDeleteState() {
      if (!slug) return;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoadingAction(false);
        return;
      }

      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!product || cancelled) {
        setLoadingAction(false);
        return;
      }

      const { data: pending } = await supabase
        .from("moderation_requests")
        .select("id")
        .eq("subject_type", "product")
        .eq("subject_id", product.id)
        .eq("action", "publish")
        .eq("status", "pending")
        .maybeSingle();

      if (!cancelled) {
        setProductId(product.id);
        setPendingReview(Boolean(pending));
        setLoadingAction(false);
      }
    }

    void loadDeleteState();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function deleteProduct() {
    if (!productId || pendingReview || deleting) return;
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا المنتج؟ سيتم إخفاؤه من المتجر ومن قائمة منتجاتك مع الاحتفاظ بالسجل التاريخي للطلبات والمراجعات."
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    const supabase = createClient();
    const { error: archiveError } = await supabase.rpc("archive_own_product", {
      target_product_id: productId,
    });

    if (archiveError) {
      setError(
        archiveError.message.includes("pending review")
          ? "لا يمكن حذف المنتج أثناء المراجعة."
          : "تعذر حذف المنتج."
      );
      setDeleting(false);
      return;
    }

    router.replace("/artisan/products");
    router.refresh();
  }

  return (
    <>
      {children}
      {productId && (
        <div className="fixed bottom-5 right-5 z-50 flex max-w-sm flex-col items-end gap-2">
          {error && (
            <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
              {error}
            </div>
          )}
          <button
            type="button"
            disabled={loadingAction || pendingReview || deleting}
            onClick={() => void deleteProduct()}
            className="rounded-[var(--radius-md)] border border-red-300 bg-white px-5 py-3 text-sm font-medium text-red-700 shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            title={pendingReview ? "لا يمكن حذف المنتج وهو قيد المراجعة" : "حذف المنتج"}
          >
            {deleting ? "جاري الحذف..." : pendingReview ? "الحذف مقفول أثناء المراجعة" : "حذف المنتج"}
          </button>
        </div>
      )}
    </>
  );
}

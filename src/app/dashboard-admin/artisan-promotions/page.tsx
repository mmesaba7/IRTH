"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PromotionRow = {
  id: string;
  artisan_id: string;
  discount_type: "percentage" | "fixed";
  discount_value: number | string;
  approval_status: "pending" | "approved" | "rejected";
  is_enabled: boolean;
  start_at: string;
  end_at: string;
  admin_note: string | null;
  created_at: string;
};

type PromotionProductRow = {
  promotion_id: string;
  product_id: string;
};

type ProductRow = {
  id: string;
  name_ar: string | null;
  name_en: string;
};

type ArtisanRow = {
  id: string;
  name_ar: string | null;
  name_en: string;
};

type ReviewItem = PromotionRow & {
  artisanName: string;
  productNames: string[];
};

function displayStatus(item: PromotionRow) {
  if (item.approval_status === "pending") return "Pending";
  if (item.approval_status === "rejected") return "Rejected";
  if (!item.is_enabled) return "Disabled";

  const now = Date.now();
  if (now < new Date(item.start_at).getTime()) return "Scheduled";
  if (now >= new Date(item.end_at).getTime()) return "Expired";
  return "Active";
}

export default function AdminArtisanPromotionsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/dashboard-admin/login");
      return;
    }

    const { data: promotionData, error: promotionError } = await supabase
      .from("promotions")
      .select(
        "id, artisan_id, discount_type, discount_value, approval_status, is_enabled, start_at, end_at, admin_note, created_at"
      )
      .eq("source_type", "artisan")
      .order("created_at", { ascending: false });

    if (promotionError) {
      console.error("Could not load artisan promotions:", promotionError);
      setError("تعذر تحميل عروض الحرفيين.");
      setLoading(false);
      return;
    }

    const promotions = (promotionData ?? []) as PromotionRow[];
    if (promotions.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const promotionIds = promotions.map((promotion) => promotion.id);
    const artisanIds = [...new Set(promotions.map((promotion) => promotion.artisan_id))];

    const [linksResult, artisansResult] = await Promise.all([
      supabase
        .from("promotion_products")
        .select("promotion_id, product_id")
        .in("promotion_id", promotionIds),
      supabase
        .from("artisan_profiles")
        .select("id, name_ar, name_en")
        .in("id", artisanIds),
    ]);

    if (linksResult.error || artisansResult.error) {
      console.error("Could not load promotion relations:", {
        links: linksResult.error,
        artisans: artisansResult.error,
      });
      setError("تعذر تحميل تفاصيل العروض.");
      setLoading(false);
      return;
    }

    const links = (linksResult.data ?? []) as PromotionProductRow[];
    const productIds = [...new Set(links.map((link) => link.product_id))];

    let products: ProductRow[] = [];
    if (productIds.length > 0) {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("id, name_ar, name_en")
        .in("id", productIds);

      if (productError) {
        console.error("Could not load promotion products:", productError);
        setError("تعذر تحميل منتجات العروض.");
        setLoading(false);
        return;
      }

      products = (productData ?? []) as ProductRow[];
    }

    const artisanMap = new Map(
      ((artisansResult.data ?? []) as ArtisanRow[]).map((artisan) => [artisan.id, artisan])
    );
    const productMap = new Map(products.map((product) => [product.id, product]));

    setItems(
      promotions.map((promotion) => {
        const artisan = artisanMap.get(promotion.artisan_id);
        return {
          ...promotion,
          artisanName: artisan?.name_ar || artisan?.name_en || "Unknown artisan",
          productNames: links
            .filter((link) => link.promotion_id === promotion.id)
            .map((link) => productMap.get(link.product_id))
            .filter((product): product is ProductRow => Boolean(product))
            .map((product) => product.name_ar || product.name_en),
        };
      })
    );

    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const reviewPromotion = async (
    promotionId: string,
    decision: "approved" | "rejected"
  ) => {
    const note = notes[promotionId]?.trim() || "";

    if (decision === "rejected" && !note) {
      setError("سبب الرفض مطلوب.");
      return;
    }

    setBusyId(promotionId);
    setError("");
    setMessage("");

    const { error: reviewError } = await supabase.rpc("review_artisan_promotion", {
      p_promotion_id: promotionId,
      p_decision: decision,
      p_admin_note: note || null,
    });

    if (reviewError) {
      console.error("Could not review artisan promotion:", reviewError);
      setError("تعذر تحديث قرار المراجعة.");
      setBusyId(null);
      return;
    }

    setMessage(decision === "approved" ? "تم اعتماد العرض." : "تم رفض العرض وتسجيل السبب.");
    setNotes((current) => ({ ...current, [promotionId]: "" }));
    setBusyId(null);
    await loadData();
  };

  const toggleEnabled = async (item: ReviewItem) => {
    setBusyId(item.id);
    setError("");
    setMessage("");

    const { error: toggleError } = await supabase.rpc("set_promotion_enabled", {
      p_promotion_id: item.id,
      p_is_enabled: !item.is_enabled,
    });

    if (toggleError) {
      console.error("Could not change promotion state:", toggleError);
      setError("تعذر تغيير حالة العرض.");
      setBusyId(null);
      return;
    }

    setMessage(item.is_enabled ? "تم إيقاف العرض." : "تم تشغيل العرض.");
    setBusyId(null);
    await loadData();
  };

  const filteredItems = items.filter((item) =>
    filter === "all" ? true : item.approval_status === filter
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--text-secondary)]">جاري تحميل عروض الحرفيين...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <section className="mx-auto max-w-[var(--container-max)] px-5 py-10 md:px-6">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Admin Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              مراجعة عروض الحرفيين
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              الموافقة مطلوبة قبل ظهور أي عرض Artisan للعملاء.
            </p>
          </div>

          <Link
            href="/dashboard-admin/dashboard"
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)]"
          >
            ← Back
          </Link>
        </div>

        {message && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {([
            ["pending", "Pending"],
            ["approved", "Approved"],
            ["rejected", "Rejected"],
            ["all", "All"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-2 text-xs font-medium ${
                filter === value
                  ? "bg-[var(--color-espresso)] text-[var(--color-ivory)]"
                  : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-5">
          {filteredItems.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-8 text-center text-[var(--text-secondary)]">
              لا توجد عروض في هذه الحالة.
            </div>
          ) : (
            filteredItems.map((item) => {
              const status = displayStatus(item);
              const busy = busyId === item.id;

              return (
                <article
                  key={item.id}
                  className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                          {item.artisanName}
                        </h2>
                        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium">
                          {status}
                        </span>
                      </div>

                      <p className="mt-3 font-medium text-[var(--color-copper)]">
                        {item.discount_type === "percentage"
                          ? `${Number(item.discount_value)}% خصم`
                          : `$${Number(item.discount_value).toFixed(2)} خصم`}
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        المنتجات: {item.productNames.join("، ") || "—"}
                      </p>
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        {new Date(item.start_at).toLocaleString("ar-EG")} → {new Date(item.end_at).toLocaleString("ar-EG")}
                      </p>
                    </div>

                    {item.approval_status === "approved" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleEnabled(item)}
                        className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm disabled:opacity-60"
                      >
                        {item.is_enabled ? "إيقاف العرض" : "تشغيل العرض"}
                      </button>
                    )}
                  </div>

                  {item.approval_status === "pending" && (
                    <div className="mt-5 border-t border-[var(--border-soft)] pt-5">
                      <textarea
                        value={notes[item.id] || ""}
                        onChange={(event) =>
                          setNotes((current) => ({ ...current, [item.id]: event.target.value }))
                        }
                        placeholder="سبب الرفض مطلوب عند الرفض"
                        rows={2}
                        className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm"
                      />

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => reviewPromotion(item.id, "approved")}
                          className="rounded-[var(--radius-md)] bg-green-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                        >
                          اعتماد
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => reviewPromotion(item.id, "rejected")}
                          className="rounded-[var(--radius-md)] bg-red-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                        >
                          رفض
                        </button>
                      </div>
                    </div>
                  )}

                  {item.admin_note && (
                    <div className="mt-4 rounded-[var(--radius-md)] bg-red-50 p-3 text-sm text-red-700">
                      <strong>ملاحظة الإدارة:</strong> {item.admin_note}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type ReviewStatus = "pending" | "approved" | "rejected";

type PriceRequest = {
  id: string;
  subject_id: string;
  status: ReviewStatus;
  admin_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  proposed_data: {
    market_id?: string;
    price?: string | number;
  } | null;
};

type Product = {
  id: string;
  name_ar: string | null;
  name_en: string;
  artisan_id: string;
};

type Artisan = {
  id: string;
  name_ar: string | null;
  name_en: string;
};

type Market = {
  id: string;
  slug: string;
  currency_code: string;
};

type MarketPrice = {
  product_id: string;
  market_id: string;
  price: number;
  is_active: boolean;
};

type ReviewItem = {
  request: PriceRequest;
  product: Product;
  artisan: Artisan | null;
  market: Market | null;
  currentPrice: number | null;
  requestedPrice: number | null;
};

export default function AdminProductPriceReviewsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [filter, setFilter] = useState<"all" | ReviewStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      router.push("/dashboard-admin/login");
      return;
    }

    const { data: requestRows, error: requestError } = await supabase
      .from("moderation_requests")
      .select("id, subject_id, status, admin_note, submitted_at, reviewed_at, proposed_data")
      .eq("subject_type", "product_market_price")
      .eq("action", "update")
      .order("submitted_at", { ascending: false });

    if (requestError) {
      setError("تعذر تحميل طلبات تعديل الأسعار.");
      setLoading(false);
      return;
    }

    const requests = (requestRows ?? []) as PriceRequest[];
    if (requests.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const productIds = [...new Set(requests.map((row) => row.subject_id))];
    const marketIds = [...new Set(requests.map((row) => row.proposed_data?.market_id).filter((value): value is string => typeof value === "string"))];

    const [productsResult, marketsResult, pricesResult] = await Promise.all([
      supabase.from("products").select("id, name_ar, name_en, artisan_id").in("id", productIds),
      marketIds.length > 0
        ? supabase.from("markets").select("id, slug, currency_code").in("id", marketIds)
        : Promise.resolve({ data: [], error: null }),
      marketIds.length > 0
        ? supabase
            .from("product_market_prices")
            .select("product_id, market_id, price, is_active")
            .in("product_id", productIds)
            .in("market_id", marketIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (productsResult.error || marketsResult.error || pricesResult.error) {
      setError("تعذر تحميل بيانات المنتجات أو الأسواق.");
      setLoading(false);
      return;
    }

    const products = (productsResult.data ?? []) as Product[];
    const artisanIds = [...new Set(products.map((product) => product.artisan_id))];
    const { data: artisanRows, error: artisanError } = artisanIds.length > 0
      ? await supabase.from("artisan_profiles").select("id, name_ar, name_en").in("id", artisanIds)
      : { data: [], error: null };

    if (artisanError) {
      setError("تعذر تحميل بيانات الحرفيين.");
      setLoading(false);
      return;
    }

    const productMap = new Map(products.map((row) => [row.id, row]));
    const marketMap = new Map(((marketsResult.data ?? []) as Market[]).map((row) => [row.id, row]));
    const artisanMap = new Map(((artisanRows ?? []) as Artisan[]).map((row) => [row.id, row]));
    const priceMap = new Map(
      ((pricesResult.data ?? []) as MarketPrice[])
        .filter((row) => row.is_active)
        .map((row) => [`${row.product_id}:${row.market_id}`, Number(row.price)])
    );

    const nextItems: ReviewItem[] = [];
    for (const request of requests) {
      const product = productMap.get(request.subject_id);
      if (!product) continue;
      const marketId = request.proposed_data?.market_id;
      const requestedPrice = Number(request.proposed_data?.price);
      nextItems.push({
        request,
        product,
        artisan: artisanMap.get(product.artisan_id) ?? null,
        market: typeof marketId === "string" ? marketMap.get(marketId) ?? null : null,
        currentPrice:
          typeof marketId === "string"
            ? priceMap.get(`${product.id}:${marketId}`) ?? null
            : null,
        requestedPrice: Number.isFinite(requestedPrice) ? requestedPrice : null,
      });
    }

    setItems(nextItems);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function reviewRequest(requestId: string, status: "approved" | "rejected") {
    const note = rejectNotes[requestId]?.trim() || null;
    if (status === "rejected" && !note) {
      setError("اكتب سبب الرفض قبل رفض تعديل السعر.");
      return;
    }

    setWorkingId(requestId);
    setError("");
    setMessage("");

    const supabase = createClient();
    const { error: reviewError } = await supabase.rpc("review_product_market_price_request", {
      target_request_id: requestId,
      target_status: status,
      target_admin_note: note,
    });

    if (reviewError) {
      setError("تعذر مراجعة طلب تعديل السعر.");
      setWorkingId(null);
      return;
    }

    setMessage(status === "approved" ? "تم اعتماد السعر الجديد للسوق." : "تم رفض تعديل السعر وتسجيل السبب.");
    setWorkingId(null);
    setRejectNotes((current) => ({ ...current, [requestId]: "" }));
    await loadItems();
  }

  const filteredItems = useMemo(
    () => items.filter((item) => filter === "all" || item.request.status === filter),
    [filter, items]
  );

  const count = (status: ReviewStatus) => items.filter((item) => item.request.status === status).length;

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[var(--background)] text-[var(--text-secondary)]">جاري تحميل مراجعات الأسعار...</div>;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[var(--container-max)] px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Admin Panel</p>
            <h1 className="mt-1 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] sm:text-4xl">Product Price Reviews</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">مراجعة طلبات تعديل أسعار المنتجات حسب السوق قبل تطبيقها على المتجر.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard-admin/products" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm">Product Reviews</Link>
            <Link href="/dashboard-admin/dashboard" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm">← Dashboard</Link>
          </div>
        </div>

        {message && <div className="mt-6 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-6 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="mt-6 flex flex-wrap gap-2">
          {([[
            "pending",
            `Pending (${count("pending")})`,
          ], ["approved", `Approved (${count("approved")})`], ["rejected", `Rejected (${count("rejected")})`], ["all", `All (${items.length})`]] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-xs font-medium ${filter === value ? "bg-[var(--color-espresso)] text-[var(--color-ivory)]" : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"}`}>{label}</button>
          ))}
        </div>

        {filteredItems.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center text-[var(--text-secondary)]">لا توجد طلبات تعديل سعر في هذه الحالة.</div>
        ) : (
          <div className="mt-8 space-y-4">
            {filteredItems.map((item) => {
              const isPending = item.request.status === "pending";
              const isWorking = workingId === item.request.id;
              const currency = item.market?.currency_code ?? "";
              return (
                <article key={item.request.id} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">{item.product.name_ar || item.product.name_en}</h2>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.request.status === "approved" ? "bg-green-100 text-green-700" : item.request.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{item.request.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">Artisan: {item.artisan?.name_ar || item.artisan?.name_en || "Unknown"}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">Market: {item.market?.slug ?? "Unknown"} · {currency}</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4">
                          <p className="text-xs text-[var(--text-muted)]">Current approved price</p>
                          <p className="mt-1 text-xl font-semibold text-[var(--color-espresso)]">{item.currentPrice === null ? "Not priced yet" : `${item.currentPrice} ${currency}`}</p>
                        </div>
                        <div className="rounded-[var(--radius-md)] border border-[var(--color-copper)] p-4">
                          <p className="text-xs text-[var(--text-muted)]">Requested price</p>
                          <p className="mt-1 text-xl font-semibold text-[var(--color-copper)]">{item.requestedPrice === null ? "Invalid" : `${item.requestedPrice} ${currency}`}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-[var(--text-muted)]">Submitted: {new Date(item.request.submitted_at).toLocaleString()}</p>
                      {item.request.admin_note && <p className="mt-2 text-sm text-[var(--text-secondary)]">Admin note: {item.request.admin_note}</p>}
                    </div>
                  </div>

                  {isPending && (
                    <div className="mt-5 border-t border-[var(--border-soft)] pt-5">
                      <textarea rows={3} value={rejectNotes[item.request.id] ?? ""} onChange={(event) => setRejectNotes((current) => ({ ...current, [item.request.id]: event.target.value }))} placeholder="سبب الرفض مطلوب فقط عند الرفض" className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]" />
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button type="button" disabled={isWorking} onClick={() => void reviewRequest(item.request.id, "approved")} className="rounded-[var(--radius-md)] bg-green-700 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">{isWorking ? "جاري..." : "Approve Price"}</button>
                        <button type="button" disabled={isWorking} onClick={() => void reviewRequest(item.request.id, "rejected")} className="rounded-[var(--radius-md)] bg-red-700 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">Reject Price</button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

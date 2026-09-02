"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import Header from "../../../../components/Header";
import ProductMediaManager from "../../ProductMediaManager";
import { createClient } from "@/lib/supabase/client";

type ProductForm = {
  id: string;
  slug: string;
  primary_craft_id: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  story_ar: string;
  story_en: string;
  material_ar: string;
  material_en: string;
  dimensions: string;
  weight: string;
  preparation_time: string;
  price: string;
  quantity: string;
  made_to_order: boolean;
  one_of_a_kind: boolean;
  customization: boolean;
  lifecycle_status: string;
};

type Craft = {
  id: string;
  name_ar: string | null;
  name_en: string;
};

type Market = {
  id: string;
  slug: string;
  currency_code: string;
  is_active: boolean;
};

type MarketPrice = {
  market_id: string;
  price: number;
  is_active: boolean;
};

type PriceRequest = {
  id: string;
  proposed_data: {
    market_id?: string;
    price?: string | number;
  } | null;
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [product, setProduct] = useState<ProductForm | null>(null);
  const [crafts, setCrafts] = useState<Craft[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, MarketPrice>>({});
  const [pendingPriceRequests, setPendingPriceRequests] = useState<Record<string, PriceRequest>>({});
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [inventoryInput, setInventoryInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);
  const [priceWorkingMarketId, setPriceWorkingMarketId] = useState<string | null>(null);
  const [isPendingReview, setIsPendingReview] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadProduct = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/artisan/login");
      return;
    }

    const { data, error: productError } = await supabase
      .from("products")
      .select(
        "id, slug, primary_craft_id, name_ar, name_en, description_ar, description_en, story_ar, story_en, material_ar, material_en, dimensions, weight, preparation_time, price, quantity, made_to_order, one_of_a_kind, customization, lifecycle_status"
      )
      .eq("slug", slug)
      .maybeSingle();

    if (productError) {
      setError("تعذر تحميل المنتج.");
      setLoading(false);
      return;
    }

    if (!data) {
      setProduct(null);
      setLoading(false);
      return;
    }

    const [pendingResult, craftsResult, marketsResult, marketPricesResult, priceRequestsResult] =
      await Promise.all([
        supabase
          .from("moderation_requests")
          .select("id")
          .eq("subject_type", "product")
          .eq("subject_id", data.id)
          .eq("action", "publish")
          .eq("status", "pending")
          .maybeSingle(),
        supabase
          .from("crafts")
          .select("id, name_ar, name_en")
          .eq("is_active", true)
          .order("name_en", { ascending: true }),
        supabase
          .from("markets")
          .select("id, slug, currency_code, is_active")
          .eq("is_active", true)
          .order("slug", { ascending: true }),
        supabase
          .from("product_market_prices")
          .select("market_id, price, is_active")
          .eq("product_id", data.id)
          .eq("is_active", true),
        supabase
          .from("moderation_requests")
          .select("id, proposed_data")
          .eq("subject_type", "product_market_price")
          .eq("subject_id", data.id)
          .eq("action", "update")
          .eq("status", "pending"),
      ]);

    if (pendingResult.error) {
      setError("تعذر التحقق من حالة المراجعة.");
      setLoading(false);
      return;
    }
    if (craftsResult.error) {
      setError("تعذر تحميل الحرف.");
      setLoading(false);
      return;
    }
    if (marketsResult.error || marketPricesResult.error || priceRequestsResult.error) {
      setError("تعذر تحميل إعدادات السعر الخاصة بالمنتج.");
      setLoading(false);
      return;
    }

    const nextProduct: ProductForm = {
      id: data.id,
      slug: data.slug,
      primary_craft_id: data.primary_craft_id,
      name_ar: data.name_ar ?? "",
      name_en: data.name_en ?? "",
      description_ar: data.description_ar ?? "",
      description_en: data.description_en ?? "",
      story_ar: data.story_ar ?? "",
      story_en: data.story_en ?? "",
      material_ar: data.material_ar ?? "",
      material_en: data.material_en ?? "",
      dimensions: data.dimensions ?? "",
      weight: data.weight ?? "",
      preparation_time: data.preparation_time ?? "",
      price: String(data.price ?? ""),
      quantity: String(data.quantity ?? 0),
      made_to_order: Boolean(data.made_to_order),
      one_of_a_kind: Boolean(data.one_of_a_kind),
      customization: Boolean(data.customization),
      lifecycle_status: data.lifecycle_status,
    };

    const nextMarketPrices: Record<string, MarketPrice> = {};
    for (const row of (marketPricesResult.data ?? []) as MarketPrice[]) {
      nextMarketPrices[row.market_id] = row;
    }

    const nextPendingRequests: Record<string, PriceRequest> = {};
    for (const row of (priceRequestsResult.data ?? []) as PriceRequest[]) {
      const marketId = row.proposed_data?.market_id;
      if (typeof marketId === "string") nextPendingRequests[marketId] = row;
    }

    setProduct(nextProduct);
    setInventoryInput(nextProduct.quantity);
    setCrafts((craftsResult.data ?? []) as Craft[]);
    setMarkets((marketsResult.data ?? []) as Market[]);
    setMarketPrices(nextMarketPrices);
    setPendingPriceRequests(nextPendingRequests);
    setIsPendingReview(Boolean(pendingResult.data));
    setLoading(false);
  }, [router, slug]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const isPublished = product?.lifecycle_status === "published";
  const contentEditingDisabled = isPendingReview || isSaving;
  const canManualInventoryUpdate = Boolean(
    product && isPublished && !product.made_to_order && !product.one_of_a_kind
  );

  const marketRows = useMemo(
    () => markets.filter((market) => market.is_active),
    [markets]
  );

  function updateField<K extends keyof ProductForm>(field: K, value: ProductForm[K]) {
    setProduct((current) => (current ? { ...current, [field]: value } : current));
  }

  function updateMadeToOrder(checked: boolean) {
    setProduct((current) =>
      current
        ? {
            ...current,
            made_to_order: checked,
            one_of_a_kind: checked ? false : current.one_of_a_kind,
            quantity: checked ? "0" : current.quantity,
          }
        : current
    );
  }

  function updateOneOfAKind(checked: boolean) {
    setProduct((current) =>
      current
        ? {
            ...current,
            one_of_a_kind: checked,
            made_to_order: checked ? false : current.made_to_order,
            quantity: checked ? "1" : current.quantity,
          }
        : current
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!product || isSaving) return;

    setError("");
    setMessage("");

    if (isPendingReview) {
      setError("لا يمكن تعديل محتوى المنتج أثناء وجوده قيد المراجعة.");
      return;
    }
    if (!product.name_ar.trim() || !product.name_en.trim()) {
      setError("اسم المنتج بالعربي والإنجليزي مطلوب.");
      return;
    }
    if (!product.primary_craft_id) {
      setError("الحرفة الأساسية مطلوبة.");
      return;
    }

    const price = Number(product.price);
    if (!Number.isFinite(price) || price < 0) {
      setError("السعر غير صحيح.");
      return;
    }

    let quantity: number | null = null;
    if (product.one_of_a_kind) {
      quantity = 1;
    } else if (!product.made_to_order) {
      quantity = Number(product.quantity);
      if (!Number.isInteger(quantity) || quantity < 0) {
        setError("الكمية يجب أن تكون رقمًا صحيحًا صفر أو أكبر.");
        return;
      }
    }

    setIsSaving(true);
    const supabase = createClient();
    const { data, error: updateError } = await supabase.rpc(
      "update_own_product_content",
      {
        target_product_id: product.id,
        target_primary_craft_id: product.primary_craft_id,
        target_name_ar: product.name_ar,
        target_name_en: product.name_en,
        target_description_ar: product.description_ar,
        target_description_en: product.description_en,
        target_story_ar: product.story_ar,
        target_story_en: product.story_en,
        target_material_ar: product.material_ar,
        target_material_en: product.material_en,
        target_dimensions: product.dimensions,
        target_weight: product.weight,
        target_preparation_time: product.preparation_time,
        target_price: price,
        target_quantity: quantity,
        target_made_to_order: product.made_to_order,
        target_one_of_a_kind: product.one_of_a_kind,
        target_customization: product.customization,
      }
    );

    if (updateError) {
      setError("تعذر حفظ تعديلات المنتج. تأكد أنه ليس قيد المراجعة وحاول مرة أخرى.");
      setIsSaving(false);
      return;
    }

    const result = Array.isArray(data) ? data[0] : null;
    if (result?.requires_review) {
      setMessage(
        "تم حفظ التعديلات وإيقاف نشر النسخة القديمة. استكمل الصور أو الفيديو إن لزم، ثم ارجع إلى المنتجات واضغط إرسال للمراجعة."
      );
    } else {
      setMessage("تم حفظ بيانات المنتج بنجاح.");
    }

    setIsSaving(false);
    await loadProduct();
  }

  async function updateInventory() {
    if (!product || !canManualInventoryUpdate || isUpdatingInventory) return;
    setError("");
    setMessage("");

    const quantity = Number(inventoryInput);
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError("الكمية يجب أن تكون رقمًا صحيحًا صفر أو أكبر.");
      return;
    }

    setIsUpdatingInventory(true);
    const supabase = createClient();
    const { error: inventoryError } = await supabase.rpc(
      "update_own_product_inventory",
      {
        target_product_id: product.id,
        target_quantity: quantity,
      }
    );

    if (inventoryError) {
      setError("تعذر تحديث المخزون.");
      setIsUpdatingInventory(false);
      return;
    }

    setMessage("تم تحديث المخزون بدون تغيير حالة مراجعة محتوى المنتج.");
    setIsUpdatingInventory(false);
    await loadProduct();
  }

  async function requestMarketPrice(market: Market) {
    if (!product || !isPublished || priceWorkingMarketId) return;
    setError("");
    setMessage("");

    const raw = priceInputs[market.id] ?? "";
    const price = Number(raw);
    if (!Number.isFinite(price) || price <= 0) {
      setError("السعر الجديد يجب أن يكون أكبر من صفر.");
      return;
    }

    setPriceWorkingMarketId(market.id);
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/artisan/login");
      return;
    }

    const { error: requestError } = await supabase.from("moderation_requests").insert({
      subject_type: "product_market_price",
      subject_id: product.id,
      action: "update",
      status: "pending",
      requested_by: user.id,
      proposed_data: {
        market_id: market.id,
        price,
      },
    });

    if (requestError) {
      setError(
        requestError.code === "23505"
          ? "يوجد طلب تعديل سعر قيد المراجعة لهذا السوق بالفعل."
          : "تعذر إرسال طلب تعديل السعر."
      );
      setPriceWorkingMarketId(null);
      return;
    }

    setPriceInputs((current) => ({ ...current, [market.id]: "" }));
    setMessage("تم إرسال تعديل السعر إلى IRTH للمراجعة. السعر الحالي سيظل كما هو حتى الموافقة.");
    setPriceWorkingMarketId(null);
    await loadProduct();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center text-[var(--text-secondary)]">
          جاري تحميل المنتج...
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 flex-col items-center justify-center gap-4">
          <p className="text-lg text-[var(--text-secondary)]">المنتج غير موجود أو تم حذفه.</p>
          <Link href="/artisan/products" className="text-sm text-[var(--color-copper)]">
            العودة للمنتجات
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Artisan Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              تعديل المنتج
            </h1>
            <p className="mt-2 max-w-3xl text-[var(--text-secondary)]">
              {isPublished
                ? "أي تعديل في محتوى المنتج أو وسائطه سيوقف نشره مؤقتًا ويحتاج مراجعة IRTH من جديد. المخزون والسعر لهما مسارات منفصلة وآمنة."
                : "عدّل المسودة واستكمل الصور والفيديو، ثم ارجع إلى إدارة المنتجات وأرسلها للمراجعة."}
            </p>
          </div>
          <Link href="/artisan/products" className="text-sm text-[var(--color-copper)]">
            العودة للمنتجات
          </Link>
        </div>

        {isPendingReview && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
            المنتج قيد المراجعة الآن. محتوى المنتج والوسائط مقفولان حتى يصدر قرار IRTH.
          </div>
        )}
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

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <Panel title="المعلومات الأساسية">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="اسم المنتج بالعربي">
                <input className={inputClass} value={product.name_ar} disabled={contentEditingDisabled} onChange={(e) => updateField("name_ar", e.target.value)} />
              </Field>
              <Field label="Product name in English">
                <input className={inputClass} value={product.name_en} disabled={contentEditingDisabled} onChange={(e) => updateField("name_en", e.target.value)} />
              </Field>
              <Field label="الحرفة الأساسية">
                <select className={inputClass} value={product.primary_craft_id} disabled={contentEditingDisabled} onChange={(e) => updateField("primary_craft_id", e.target.value)}>
                  {crafts.map((craft) => (
                    <option key={craft.id} value={craft.id}>
                      {craft.name_ar || craft.name_en} — {craft.name_en}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field label="الوصف بالعربي">
                <textarea rows={5} className={inputClass} value={product.description_ar} disabled={contentEditingDisabled} onChange={(e) => updateField("description_ar", e.target.value)} />
              </Field>
              <Field label="Description in English">
                <textarea rows={5} className={inputClass} value={product.description_en} disabled={contentEditingDisabled} onChange={(e) => updateField("description_en", e.target.value)} />
              </Field>
            </div>
          </Panel>

          <Panel title="الخامة والقصة والتفاصيل">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="الخامة بالعربي">
                <input className={inputClass} value={product.material_ar} disabled={contentEditingDisabled} onChange={(e) => updateField("material_ar", e.target.value)} />
              </Field>
              <Field label="Material in English">
                <input className={inputClass} value={product.material_en} disabled={contentEditingDisabled} onChange={(e) => updateField("material_en", e.target.value)} />
              </Field>
              <Field label="الأبعاد">
                <input className={inputClass} value={product.dimensions} disabled={contentEditingDisabled} onChange={(e) => updateField("dimensions", e.target.value)} />
              </Field>
              <Field label="الوزن">
                <input className={inputClass} value={product.weight} disabled={contentEditingDisabled} onChange={(e) => updateField("weight", e.target.value)} />
              </Field>
              <Field label="مدة التجهيز">
                <input className={inputClass} value={product.preparation_time} disabled={contentEditingDisabled} onChange={(e) => updateField("preparation_time", e.target.value)} />
              </Field>
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field label="قصة المنتج بالعربي">
                <textarea rows={4} className={inputClass} value={product.story_ar} disabled={contentEditingDisabled} onChange={(e) => updateField("story_ar", e.target.value)} />
              </Field>
              <Field label="Product story in English">
                <textarea rows={4} className={inputClass} value={product.story_en} disabled={contentEditingDisabled} onChange={(e) => updateField("story_en", e.target.value)} />
              </Field>
            </div>
          </Panel>

          <Panel title="خصائص المنتج">
            <div className="grid gap-3 sm:grid-cols-3">
              <CheckField label="يصنع حسب الطلب" checked={product.made_to_order} disabled={contentEditingDisabled} onChange={updateMadeToOrder} />
              <CheckField label="قطعة فريدة" checked={product.one_of_a_kind} disabled={contentEditingDisabled} onChange={updateOneOfAKind} />
              <CheckField label="قابل للتخصيص" checked={product.customization} disabled={contentEditingDisabled} onChange={(checked) => updateField("customization", checked)} />
            </div>
          </Panel>

          {!isPublished && (
            <Panel title="السعر والمخزون قبل النشر">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="السعر الأساسي">
                  <input type="number" min="0" step="0.01" className={inputClass} value={product.price} disabled={contentEditingDisabled} onChange={(e) => updateField("price", e.target.value)} />
                </Field>
                {!product.made_to_order && (
                  <Field label="الكمية">
                    <input type="number" min="0" step="1" className={inputClass} value={product.one_of_a_kind ? "1" : product.quantity} disabled={contentEditingDisabled || product.one_of_a_kind} onChange={(e) => updateField("quantity", e.target.value)} />
                  </Field>
                )}
              </div>
            </Panel>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={contentEditingDisabled} className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-3 text-sm font-medium text-[var(--color-ivory)] disabled:cursor-not-allowed disabled:opacity-50">
              {isSaving ? "جاري الحفظ..." : isPublished ? "حفظ المحتوى وإعادته للمراجعة" : "حفظ بيانات المسودة"}
            </button>
            <Link href="/artisan/products" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-6 py-3 text-center text-sm text-[var(--text-secondary)]">
              العودة لإدارة المنتجات
            </Link>
          </div>
        </form>

        <div className="mt-8">
          <ProductMediaManager
            productId={product.id}
            productLifecycle={product.lifecycle_status}
            pendingReview={isPendingReview}
            onMutation={loadProduct}
          />
        </div>

        {isPublished && (
          <section className="mt-8 grid gap-8 lg:grid-cols-2">
            <Panel title="المخزون المنشور">
              {canManualInventoryUpdate ? (
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    تحديث الكمية لا يغير محتوى المنتج ولا يعيده للمراجعة.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <input type="number" min="0" step="1" className={inputClass} value={inventoryInput} onChange={(e) => setInventoryInput(e.target.value)} />
                    <button type="button" disabled={isUpdatingInventory} onClick={() => void updateInventory()} className="shrink-0 rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-5 py-3 text-sm text-[var(--color-ivory)] disabled:opacity-50">
                      {isUpdatingInventory ? "جاري..." : "تحديث الكمية"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  هذا المنتج يستخدم وضع {product.made_to_order ? "يصنع حسب الطلب" : "قطعة فريدة"}، لذلك لا توجد كمية يدوية عادية لتعديلها من هنا.
                </p>
              )}
            </Panel>

            <Panel title="تعديل السعر المنشور">
              <p className="text-sm text-[var(--text-secondary)]">
                السعر الجديد لا يظهر للعميل قبل موافقة IRTH. كل سوق له طلب سعر مستقل.
              </p>
              <div className="mt-5 space-y-5">
                {marketRows.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">لا توجد أسواق نشطة حاليًا.</p>
                ) : (
                  marketRows.map((market) => {
                    const current = marketPrices[market.id];
                    const pending = pendingPriceRequests[market.id];
                    const pendingPrice = pending?.proposed_data?.price;
                    return (
                      <div key={market.id} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-[var(--color-espresso)]">{market.slug}</p>
                            <p className="text-xs text-[var(--text-muted)]">{market.currency_code}</p>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)]">
                            الحالي: {current ? current.price : product.price} {market.currency_code}
                          </p>
                        </div>
                        {pending ? (
                          <div className="mt-3 rounded bg-blue-50 p-3 text-sm text-blue-700">
                            طلب سعر قيد المراجعة: {String(pendingPrice ?? "—")} {market.currency_code}
                          </div>
                        ) : (
                          <div className="mt-3 flex gap-3">
                            <input type="number" min="0.01" step="0.01" className={inputClass} placeholder="السعر الجديد" value={priceInputs[market.id] ?? ""} onChange={(e) => setPriceInputs((currentInputs) => ({ ...currentInputs, [market.id]: e.target.value }))} />
                            <button type="button" disabled={priceWorkingMarketId === market.id} onClick={() => void requestMarketPrice(market)} className="shrink-0 rounded-[var(--radius-md)] border border-[var(--color-copper)] px-4 py-3 text-sm text-[var(--color-copper)] disabled:opacity-50">
                              {priceWorkingMarketId === market.id ? "جاري..." : "إرسال للمراجعة"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Panel>
          </section>
        )}

        {!isPendingReview && product.lifecycle_status === "draft" && (
          <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-copper)] bg-[var(--surface)] p-5 text-sm text-[var(--text-secondary)]">
            بعد ما تتأكد من البيانات والصور والفيديو، ارجع إلى إدارة المنتجات واضغط <strong className="text-[var(--color-espresso)]">إرسال للمراجعة</strong>.
          </div>
        )}
      </section>
    </main>
  );
}

const inputClass =
  "w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-60";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-7">
      <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">{label}</span>
      {children}
    </label>
  );
}

function CheckField({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-soft)] p-4 text-sm text-[var(--text-secondary)]">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "../../components/Header";
import ProductReviews from "../../components/ProductReviews";
import {
  loadPublicMarketplaceCatalog,
  type PublicCatalogProduct,
} from "@/lib/publicMarketplace";
import { useProductQuote } from "@/lib/useProductQuote";

type ProductMedia = {
  id: string;
  media_type: "image" | "video";
  signedUrl: string;
};

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [product, setProduct] = useState<PublicCatalogProduct | null>(null);
  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const {
    quote,
    item: quoteItem,
    loading: quoteLoading,
    marketRequired,
    error: quoteError,
  } = useProductQuote(slug, quantity);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const catalog = await loadPublicMarketplaceCatalog();
        if (cancelled) return;
        const publicProduct = catalog.products.find((item) => item.slug === slug) ?? null;
        if (!publicProduct) {
          setProduct(null);
          setMedia([]);
          return;
        }

        setProduct(publicProduct);

        const savedProducts = JSON.parse(localStorage.getItem("irth-saved-products") || "[]") as string[];
        setSaved(savedProducts.includes(publicProduct.slug));

        const recentlyViewed = JSON.parse(localStorage.getItem("irth-recently-viewed") || "[]") as string[];
        localStorage.setItem(
          "irth-recently-viewed",
          JSON.stringify([publicProduct.slug, ...recentlyViewed.filter((item) => item !== publicProduct.slug)].slice(0, 20))
        );

        try {
          const response = await fetch(`/api/products/${publicProduct.id}/media`, { cache: "no-store" });
          if (response.ok && !cancelled) {
            const payload = (await response.json()) as { media?: ProductMedia[]; coverMediaId?: string | null };
            const mediaItems = payload.media ?? [];
            setMedia(mediaItems);
            setActiveMediaId(payload.coverMediaId ?? mediaItems[0]?.id ?? null);
          }
        } catch {
          if (!cancelled) setMedia([]);
        }
      } catch {
        if (!cancelled) setError("تعذر تحميل المنتج حاليًا.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [slug]);

  const activeMedia = useMemo(
    () => media.find((item) => item.id === activeMediaId) ?? media[0] ?? null,
    [media, activeMediaId]
  );

  const toggleSaved = () => {
    if (!product) return;
    const savedProducts = JSON.parse(localStorage.getItem("irth-saved-products") || "[]") as string[];
    const updated = saved
      ? savedProducts.filter((item) => item !== product.slug)
      : [...new Set([...savedProducts, product.slug])];
    localStorage.setItem("irth-saved-products", JSON.stringify(updated));
    window.dispatchEvent(new Event("irth-saved-updated"));
    setSaved(!saved);
  };

  const canAddToCart = quoteItem?.status === "available";
  const maxQuantity = quoteItem?.product?.made_to_order
    ? 99
    : Math.max(1, quoteItem?.product?.available_quantity ?? 1);

  const priceLabel = quoteLoading
    ? "Checking price…"
    : marketRequired
      ? "Select a market to see the price"
      : quoteError
        ? "Price unavailable"
        : quoteItem?.status === "available" && quoteItem.unitPrice && quote
          ? `${quoteItem.unitPrice} ${quote.market.currency_code}`
          : quoteItem?.status === "not_priced_for_market"
            ? "Not priced for this market"
            : quoteItem?.status === "out_of_stock"
              ? "Out of stock"
              : quoteItem?.status === "insufficient_stock"
                ? "Requested quantity is not available"
                : "Unavailable";

  const availabilityMessage = marketRequired
    ? "اختار السوق الأول علشان نعرض السعر والتوفر الصحيحين."
    : quoteError
      ? "تعذر التحقق من السعر والتوفر حاليًا."
      : quoteItem?.status === "not_priced_for_market"
        ? "المنتج ليس له سعر معتمد في السوق المختار حاليًا."
        : quoteItem?.status === "out_of_stock"
          ? "هذا المنتج غير متاح في المخزون حاليًا."
          : quoteItem?.status === "insufficient_stock"
            ? `المتاح حاليًا ${quoteItem.product?.available_quantity ?? 0} فقط.`
            : quoteItem?.status === "product_unavailable"
              ? "هذا المنتج غير متاح للشراء حاليًا."
              : null;

  const handleAddToCart = () => {
    if (!product || !canAddToCart) return;
    const storedCart = JSON.parse(localStorage.getItem("irth-cart") || "[]") as unknown;
    const cart = Array.isArray(storedCart) ? storedCart : [];
    const additions = Array.from({ length: quantity }, () => ({ slug: product.slug }));
    localStorage.setItem("irth-cart", JSON.stringify([...cart, ...additions]));
    window.dispatchEvent(new Event("irth-cart-updated"));
    router.push("/cart");
  };

  if (loading) {
    return <main className="min-h-screen bg-[var(--background)]"><Header /><div className="flex h-96 items-center justify-center text-[var(--text-secondary)]">جاري تحميل المنتج...</div></main>;
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-xl text-[var(--text-secondary)]">{error || "المنتج غير موجود أو غير منشور."}</p>
          <Link href="/crafts" className="text-[var(--color-copper)] hover:underline">العودة للحرف والمنتجات</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-5 py-10 md:px-6 md:py-16">
        <div className="text-sm text-[var(--text-muted)]">
          <Link href="/crafts" className="hover:text-[var(--color-copper)]">Crafts</Link>
          <span className="mx-2">/</span>
          <span>{product.name}</span>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface-muted)]">
              {activeMedia?.media_type === "image" ? (
                <img src={activeMedia.signedUrl} alt={product.name} className="h-full w-full object-cover" />
              ) : activeMedia?.media_type === "video" ? (
                <video src={activeMedia.signedUrl} controls className="h-full w-full bg-black object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">لا توجد وسائط متاحة.</div>
              )}
            </div>

            {media.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {media.map((item) => (
                  <button key={item.id} type="button" onClick={() => setActiveMediaId(item.id)} className={`aspect-square overflow-hidden rounded-[var(--radius-md)] border ${item.id === activeMedia?.id ? "border-[var(--color-copper)]" : "border-[var(--border-soft)]"}`}>
                    {item.media_type === "image" ? <img src={item.signedUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center">▶</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-copper)]">{product.category} · {product.country}</p>
            <h1 className="mt-3 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-6xl">{product.name}</h1>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">By <Link href={`/artisan/${product.artisanSlug}`} className="text-[var(--color-copper)] hover:underline">{product.artisan}</Link></p>
            <p className="mt-6 text-base leading-8 text-[var(--text-secondary)]">{product.description}</p>

            <div className="mt-8 flex items-center justify-between border-y border-[var(--border-soft)] py-6">
              <p className="text-3xl font-semibold text-[var(--color-copper)]">{priceLabel}</p>
              <button type="button" onClick={toggleSaved} aria-label="Save product" className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-soft)] text-xl hover:border-[var(--color-copper)]">{saved ? "♥" : "♡"}</button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              {product.madeToOrder && <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5">Made to Order</span>}
              {product.oneOfAKind && <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5">One of a Kind</span>}
              {product.customization && <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5">Customization</span>}
            </div>

            {availabilityMessage && <div className="mt-7 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">{availabilityMessage}</div>}

            <div className="mt-7 flex items-center gap-4">
              <span className="text-sm text-[var(--text-secondary)]">Quantity</span>
              <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border-soft)]">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-10 w-10">−</button>
                <span className="w-12 text-center text-sm">{quantity}</span>
                <button type="button" disabled={!quoteItem || (!quoteItem.product?.made_to_order && quantity >= maxQuantity)} onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))} className="h-10 w-10 disabled:opacity-40">+</button>
              </div>
            </div>

            <button type="button" onClick={handleAddToCart} disabled={!canAddToCart || quoteLoading} className="mt-7 rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-semibold text-[var(--color-ivory)] hover:bg-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-50">Add to cart</button>
            <Link href={`/product/${product.slug}/wholesale`} className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-copper)] px-6 py-4 text-center text-sm font-semibold text-[var(--color-copper)] hover:bg-[var(--surface-muted)]">
              طلب كمية / Wholesale
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="mx-auto grid max-w-[var(--container-max)] gap-8 px-5 py-14 md:grid-cols-3 md:px-6">
          <div><p className="section-eyebrow">Material</p><p className="mt-3 leading-7 text-[var(--text-secondary)]">{product.material || "—"}</p></div>
          <div><p className="section-eyebrow">Origin</p><p className="mt-3 leading-7 text-[var(--text-secondary)]">{product.origin || product.country}</p></div>
          <div><p className="section-eyebrow">Story</p><p className="mt-3 leading-7 text-[var(--text-secondary)]">{product.story || "—"}</p></div>
        </div>
      </section>

      <ProductReviews slug={product.slug} />
    </main>
  );
}

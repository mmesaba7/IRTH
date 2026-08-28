"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "../../components/Header";
import { createClient } from "@/lib/supabase/client";
import { getProductReviews, getProductReviewSummary } from "../../../lib/reviewUtils";

type ProductRecord = {
  id: string;
  slug: string;
  artisan_id: string;
  primary_craft_id: string;
  name_ar: string | null;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  story_ar: string | null;
  story_en: string | null;
  material_ar: string | null;
  material_en: string | null;
  price: number | string;
  dimensions: string | null;
  weight: string | null;
  made_to_order: boolean;
  preparation_time: string | null;
  one_of_a_kind: boolean;
  customization: boolean;
  lifecycle_status: string;
  quantity: number;
};

type PublicProduct = ProductRecord & {
  artisanName: string;
  artisanSlug: string;
  countryName: string;
  craftName: string;
};

type ProductMedia = {
  id: string;
  product_id: string;
  media_type: "image" | "video";
  storage_path: string;
  sort_order: number | null;
  signedUrl: string;
};

type Review = {
  id: string;
  orderId: string;
  productSlug: string;
  productName: string;
  artisanName: string;
  customerName: string;
  productRating: number;
  artisanRating: number;
  reviewText: string;
  images?: string[];
  status: "published" | "edited" | "pending_artisan_reply" | "artisan_replied";
  artisanReply?: {
    text: string;
    status: "pending_review" | "approved" | "rejected";
    createdAt: string;
    updatedAt?: string;
  };
  createdAt: string;
  updatedAt?: string;
  editCount: 0 | 1;
};

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const supabase = useMemo(() => createClient(), []);

  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<{
    averageProductRating: number;
    averageArtisanRating: number;
    totalReviews: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setError(null);

      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(
          "id, slug, artisan_id, primary_craft_id, name_ar, name_en, description_ar, description_en, story_ar, story_en, material_ar, material_en, price, dimensions, weight, made_to_order, preparation_time, one_of_a_kind, customization, lifecycle_status, quantity"
        )
        .eq("slug", slug)
        .maybeSingle();

      if (cancelled) return;

      if (productError) {
        console.error("Could not load public product:", {
          code: productError.code,
          message: productError.message,
          details: productError.details,
          hint: productError.hint,
        });
        setError("تعذر تحميل المنتج.");
        setLoading(false);
        return;
      }

      if (!productData) {
        setProduct(null);
        setLoading(false);
        return;
      }

      const typedProduct = productData as ProductRecord;

      const { data: artisanData, error: artisanError } = await supabase
        .from("artisan_profiles")
        .select("slug, name_ar, name_en, country_id")
        .eq("id", typedProduct.artisan_id)
        .maybeSingle();

      if (cancelled) return;

      if (artisanError || !artisanData) {
        console.error("Could not load public artisan:", artisanError);
        setError("تعذر تحميل بيانات الحرفي.");
        setLoading(false);
        return;
      }

      const [{ data: craftData }, { data: countryData }] = await Promise.all([
        supabase
          .from("crafts")
          .select("name_ar, name_en")
          .eq("id", typedProduct.primary_craft_id)
          .maybeSingle(),
        supabase
          .from("countries")
          .select("name_ar, name_en")
          .eq("id", artisanData.country_id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const publicProduct: PublicProduct = {
        ...typedProduct,
        artisanName: artisanData.name_en || artisanData.name_ar || "Artisan",
        artisanSlug: artisanData.slug || "",
        countryName: countryData?.name_en || countryData?.name_ar || "",
        craftName: craftData?.name_en || craftData?.name_ar || "Craft",
      };

      setProduct(publicProduct);

      try {
        const mediaResponse = await fetch(`/api/products/${typedProduct.id}/media`, {
          cache: "no-store",
        });

        if (mediaResponse.ok) {
          const mediaPayload = (await mediaResponse.json()) as {
            media?: ProductMedia[];
            coverMediaId?: string | null;
          };

          if (!cancelled) {
            const mediaItems = mediaPayload.media ?? [];
            setMedia(mediaItems);
            setActiveMediaId(
              mediaPayload.coverMediaId ?? mediaItems[0]?.id ?? null
            );
          }
        } else if (!cancelled) {
          setMedia([]);
        }
      } catch (mediaError) {
        console.error("Could not load public product media:", mediaError);
        if (!cancelled) setMedia([]);
      }

      const recentlyViewed: string[] = JSON.parse(
        localStorage.getItem("irth-recently-viewed") || "[]"
      );
      const limited = [slug, ...recentlyViewed.filter((item) => item !== slug)].slice(
        0,
        20
      );
      localStorage.setItem("irth-recently-viewed", JSON.stringify(limited));

      const productReviews = getProductReviews(slug) as Review[];
      setReviews(productReviews);

      const summary = getProductReviewSummary(slug);
      setReviewSummary(
        summary
          ? {
              averageProductRating: summary.averageProductRating,
              averageArtisanRating: summary.averageArtisanRating,
              totalReviews: summary.totalReviews,
            }
          : null
      );

      setLoading(false);
    }

    void loadProduct();

    return () => {
      cancelled = true;
    };
  }, [slug, supabase]);

  const activeMedia =
    media.find((item) => item.id === activeMediaId) ?? media[0] ?? null;

  const handleAddToCart = () => {
    if (!product || product.quantity <= 0) return;

    const cart = JSON.parse(localStorage.getItem("irth-cart") || "[]");
    const cartItem = {
      slug: product.slug,
      artisan: product.artisanName,
      name: product.name_en || product.name_ar || product.slug,
      price: Number(product.price),
    };

    for (let index = 0; index < quantity; index += 1) {
      cart.push(cartItem);
    }

    localStorage.setItem("irth-cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("irth-cart-updated"));
    router.push("/cart");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري تحميل المنتج...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-xl text-[var(--text-secondary)]">{error}</p>
          <Link href="/crafts" className="text-[var(--color-copper)] hover:underline">
            العودة للحرف والمنتجات
          </Link>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-xl text-[var(--text-secondary)]">المنتج غير موجود أو غير منشور.</p>
          <Link href="/crafts" className="text-[var(--color-copper)] hover:underline">
            العودة للحرف والمنتجات
          </Link>
        </div>
      </main>
    );
  }

  const productName = product.name_en || product.name_ar || product.slug;
  const description = product.description_en || product.description_ar || "";
  const material = product.material_en || product.material_ar || "";
  const story = product.story_en || product.story_ar || "";
  const maxQuantity = Math.max(1, product.quantity);
  const isOutOfStock = product.quantity <= 0;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        <div className="text-sm text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--color-copper)]">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/crafts" className="hover:text-[var(--color-copper)]">Crafts</Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--color-espresso)]">{productName}</span>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-muted)]">
              {activeMedia?.media_type === "image" ? (
                <img
                  src={activeMedia.signedUrl}
                  alt={productName}
                  className="h-full w-full object-cover"
                />
              ) : activeMedia?.media_type === "video" ? (
                <video
                  src={activeMedia.signedUrl}
                  controls
                  className="h-full w-full bg-black object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
                  لا توجد وسائط متاحة لهذا المنتج.
                </div>
              )}
            </div>

            {media.length > 1 && (
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                {media.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveMediaId(item.id)}
                    className={`aspect-square overflow-hidden rounded-[var(--radius-md)] border ${
                      item.id === activeMedia?.id
                        ? "border-[var(--color-copper)]"
                        : "border-[var(--border-soft)]"
                    }`}
                  >
                    {item.media_type === "image" ? (
                      <img
                        src={item.signedUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[var(--surface-muted)] text-xl">
                        ▶
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-[var(--color-copper)]">
                {product.craftName}
              </p>
              <h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">
                {productName}
              </h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                By {product.artisanName}{product.countryName ? ` · ${product.countryName}` : ""}
              </p>

              {reviewSummary && reviewSummary.totalReviews > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-sm font-medium text-[var(--color-espresso)]">
                    {reviewSummary.averageProductRating.toFixed(1)}
                  </span>
                  <span className="text-[var(--color-copper)]">
                    {"★".repeat(Math.round(reviewSummary.averageProductRating))}
                    {"☆".repeat(5 - Math.round(reviewSummary.averageProductRating))}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    ({reviewSummary.totalReviews} تقييمات)
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--border-soft)] pt-6">
              <p className="text-3xl font-bold text-[var(--color-copper)]">
                ${Number(product.price).toFixed(2)}
              </p>

              <div className="mt-6 space-y-3 text-sm">
                {product.made_to_order && (
                  <p className="text-[var(--color-olive)]">
                    🔄 Made to Order{product.preparation_time ? ` · ${product.preparation_time}` : ""}
                  </p>
                )}
                {product.one_of_a_kind && (
                  <p className="text-[var(--color-terracotta)]">✨ One of a Kind</p>
                )}
                {product.customization && (
                  <p className="text-[var(--color-copper)]">✏️ Customization available</p>
                )}
              </div>

              {isOutOfStock ? (
                <div className="mt-6 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
                  هذا المنتج غير متاح في المخزون حاليًا.
                </div>
              ) : (
                <>
                  <div className="mt-6 flex items-center gap-4">
                    <label className="text-sm text-[var(--text-secondary)]">Quantity</label>
                    <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border-soft)]">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="flex h-9 w-9 items-center justify-center text-lg hover:text-[var(--color-copper)]"
                      >
                        −
                      </button>
                      <span className="w-12 text-center text-sm">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                        className="flex h-9 w-9 items-center justify-center text-lg hover:text-[var(--color-copper)]"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="mt-6 w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
                  >
                    Add to cart 🛒
                  </button>
                </>
              )}
            </div>

            <div className="border-t border-[var(--border-soft)] pt-6">
              <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">Description</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-[var(--text-secondary)]">
                {description || "No description available."}
              </p>

              {(material || product.dimensions || product.weight) && (
                <div className="mt-6 grid grid-cols-2 gap-4 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-5">
                  {material && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Material</p>
                      <p className="mt-1 text-sm text-[var(--color-espresso)]">{material}</p>
                    </div>
                  )}
                  {product.dimensions && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Dimensions</p>
                      <p className="mt-1 text-sm text-[var(--color-espresso)]">{product.dimensions}</p>
                    </div>
                  )}
                  {product.weight && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Weight</p>
                      <p className="mt-1 text-sm text-[var(--color-espresso)]">{product.weight}</p>
                    </div>
                  )}
                </div>
              )}

              {story && (
                <div className="mt-6">
                  <h3 className="font-[var(--font-display)] text-lg text-[var(--color-espresso)]">
                    The Story Behind the Piece
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">
                    {story}
                  </p>
                </div>
              )}

              {reviews.length > 0 && (
                <div className="mt-8 border-t border-[var(--border-soft)] pt-6">
                  <h3 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
                    Customer Reviews
                  </h3>
                  <div className="mt-4 space-y-4">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] p-5"
                      >
                        <p className="font-medium text-[var(--color-espresso)]">{review.customerName}</p>
                        <p className="mt-1 text-[var(--color-copper)]">
                          {"★".repeat(review.productRating)}{"☆".repeat(5 - review.productRating)}
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                          {review.reviewText}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

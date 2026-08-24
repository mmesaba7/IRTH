"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../components/Header";
import Link from "next/link";
import { products } from "../../data/products";
import { getProductReviews, getProductReviewSummary } from "../../../lib/reviewUtils";

// تعريف شكل المنتج
type Product = {
  slug: string;
  artisanSlug: string;
  name: string;
  artisan: string;
  country: string;
  price: number;
  category: string;
  accent: "terracotta" | "olive" | "copper";
  origin: string;
  artisanRole: string;
  objectLabel: string;
  description: string;
  material: string;
  story: string;
  status?: "pending" | "approved" | "rejected";
  dimensions?: string;
  weight?: string;
  madeToOrder?: boolean;
  preparationTime?: string;
  oneOfAKind?: boolean;
  customization?: boolean;
  imageNames?: string[];
  videoName?: string | null;
};

// تعريف شكل التقييم
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

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<{
    averageProductRating: number;
    averageArtisanRating: number;
    totalReviews: number;
  } | null>(null);

  useEffect(() => {
    // ١- نجيب المنتج من localStorage
    const storedProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );
    const storedProduct = storedProducts.find((p) => p.slug === slug);

    // ٢- نجيب المنتج من الملف الأساسي (products.ts)
    const baseProduct = products[slug as keyof typeof products];

    // ٣- نختار المنتج الموجود (المخزن أو الأساسي)
    const foundProduct = storedProduct || baseProduct;
// تتبع المنتج في Recently Viewed
if (foundProduct) {
  const recentlyViewed: string[] = JSON.parse(
    localStorage.getItem("irth-recently-viewed") || "[]"
  );
  // نزيل الـ slug لو موجود عشان يتجدد ترتيبه
  const filtered = recentlyViewed.filter((s) => s !== slug);
  // نضيف الـ slug في الأول (الأحدث)
  filtered.unshift(slug);
  // نحتفظ بآخر 20 منتج فقط
  const limited = filtered.slice(0, 20);
  localStorage.setItem("irth-recently-viewed", JSON.stringify(limited));
}
    if (foundProduct) {
      setProduct(foundProduct);
    } else {
      router.push("/404");
    }

    // ٤- جلب التقييمات الخاصة بالمنتج
    const productReviews = getProductReviews(slug);
    setReviews(productReviews);

    // ٥- حساب متوسط التقييمات
    const summary = getProductReviewSummary(slug);
    if (summary) {
      setReviewSummary({
        averageProductRating: summary.averageProductRating,
        averageArtisanRating: summary.averageArtisanRating,
        totalReviews: summary.totalReviews,
      });
    }

    setLoading(false);
  }, [slug, router]);

  const handleAddToCart = () => {
    if (!product) return;

    const cart = JSON.parse(localStorage.getItem("irth-cart") || "[]");
    const cartItem = {
      slug: product.slug,
      artisan: product.artisan,
      name: product.name,
      price: product.price,
    };

    for (let i = 0; i < quantity; i++) {
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

  if (!product) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 flex-col items-center justify-center gap-4">
          <p className="text-xl text-[var(--text-secondary)]">المنتج غير موجود</p>
          <Link href="/" className="text-[var(--color-copper)] hover:underline">
            العودة للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  const accentColors = {
    terracotta: "bg-[var(--color-terracotta)]",
    olive: "bg-[var(--color-olive)]",
    copper: "bg-[var(--color-copper)]",
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        {/* Breadcrumb */}
        <div className="text-sm text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--color-copper)]">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/crafts" className="hover:text-[var(--color-copper)]">
            Crafts
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--color-espresso)]">{product.name}</span>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          {/* العمود الأيمن: صورة المنتج */}
          <div className="space-y-4">
            <div
              className={`relative aspect-[4/3] w-full rounded-[var(--radius-lg)] ${accentColors[product.accent]} overflow-hidden`}
            >
              <div className="absolute inset-4 rounded-[var(--radius-lg)] border border-white/30" />
              <div className="absolute left-1/2 top-1/2 h-48 w-36 -translate-x-1/2 -translate-y-1/2 rounded-[45%] bg-[var(--color-ivory)]/80 shadow-lg" />

              {product.imageNames && product.imageNames.length > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {product.imageNames.map((name, index) => (
                    <span
                      key={index}
                      className="h-2 w-2 rounded-full bg-[var(--color-ivory)]/60"
                    />
                  ))}
                </div>
              )}
            </div>

            {product.videoName && (
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-center text-sm text-[var(--text-muted)]">
                🎬 فيديو: {product.videoName}
              </div>
            )}
          </div>

          {/* العمود الأيسر: تفاصيل المنتج */}
          <div>
            <div className="space-y-6">
              <div>
                <p className="text-sm uppercase tracking-[0.16em] text-[var(--color-copper)]">
                  {product.category}
                </p>
                <h1 className="mt-2 font-[var(--font-display)] text-4xl md:text-5xl text-[var(--color-espresso)]">
                  {product.name}
                </h1>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  By {product.artisan} · {product.country}
                </p>

                {/* ✅ عرض التقييمات */}
                {reviewSummary && reviewSummary.totalReviews > 0 && (
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-[var(--color-espresso)]">
                        {reviewSummary.averageProductRating.toFixed(1)}
                      </span>
                      <span className="text-[var(--color-copper)]">
                        {'★'.repeat(Math.round(reviewSummary.averageProductRating))}
                        {'☆'.repeat(5 - Math.round(reviewSummary.averageProductRating))}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      ({reviewSummary.totalReviews} تقييمات)
                    </span>
                  </div>
                )}

                {/* حالة المنتج */}
                {product.status === "pending" && (
                  <span className="mt-2 inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                    ⏳ قيد المراجعة
                  </span>
                )}
              </div>

              <div className="border-t border-[var(--border-soft)] pt-6">
                <p className="text-3xl font-bold text-[var(--color-copper)]">
                  ${product.price}
                </p>

                {/* خيارات المنتج */}
                <div className="mt-6 space-y-4">
                  {product.madeToOrder && (
                    <div className="flex items-center gap-2 text-sm text-[var(--color-olive)]">
                      <span>🔄</span>
                      <span>Made to Order · {product.preparationTime || "وقت التجهيز يحدد لاحقاً"}</span>
                    </div>
                  )}

                  {product.oneOfAKind && (
                    <div className="flex items-center gap-2 text-sm text-[var(--color-terracotta)]">
                      <span>✨</span>
                      <span>One of a Kind</span>
                    </div>
                  )}

                  {product.customization && (
                    <div className="flex items-center gap-2 text-sm text-[var(--color-copper)]">
                      <span>✏️</span>
                      <span>Customization available</span>
                    </div>
                  )}
                </div>

                {/* تحديد الكمية */}
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
                      onClick={() => setQuantity(quantity + 1)}
                      className="flex h-9 w-9 items-center justify-center text-lg hover:text-[var(--color-copper)]"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* زر إضافة للسلة */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="mt-6 w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
                >
                  Add to cart 🛒
                </button>
              </div>

              {/* ✅ قسم التقييمات والمراجعات */}
              <div className="border-t border-[var(--border-soft)] pt-6">
                <h2 className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
                  Description
                </h2>
                <p className="mt-3 text-[var(--text-secondary)] leading-relaxed">
                  {product.description}
                </p>

                {(product.material || product.dimensions || product.weight) && (
                  <div className="mt-6 grid grid-cols-2 gap-4 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-5">
                    {product.material && (
                      <div>
                        <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">
                          Material
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-espresso)]">
                          {product.material}
                        </p>
                      </div>
                    )}
                    {product.dimensions && (
                      <div>
                        <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">
                          Dimensions
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-espresso)]">
                          {product.dimensions}
                        </p>
                      </div>
                    )}
                    {product.weight && (
                      <div>
                        <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">
                          Weight
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-espresso)]">
                          {product.weight}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {product.story && (
                  <div className="mt-6">
                    <h3 className="font-[var(--font-display)] text-lg text-[var(--color-espresso)]">
                      The Story Behind the Piece
                    </h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                      {product.story}
                    </p>
                  </div>
                )}

                {/* ✅ عرض التقييمات مع زر التعديل */}
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
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-[var(--color-espresso)]">
                                {review.customerName}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-[var(--color-copper)]">
                                    {'★'.repeat(review.productRating)}
                                    {'☆'.repeat(5 - review.productRating)}
                                  </span>
                                </div>
                                <span className="text-xs text-[var(--text-muted)]">
                                  {new Date(review.createdAt).toLocaleDateString("ar-EG")}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* ✅ زر تعديل (يظهر فقط إذا لم يعدل من قبل) */}
                              {review.editCount === 0 && (
                                <Link
                                  href={`/product/${slug}/review/edit`}
                                  className="text-xs text-[var(--color-copper)] hover:underline"
                                >
                                  تعديل
                                </Link>
                              )}
                              <span className="text-xs text-[var(--text-muted)]">
                                {review.status === "edited" && "🔄 تم التعديل"}
                              </span>
                            </div>
                          </div>
                          <p className="mt-3 text-sm text-[var(--text-secondary)]">
                            {review.reviewText}
                          </p>
                          {/* عرض رد الحرفي لو موجود ومعتمد */}
                          {review.artisanReply && review.artisanReply.status === "approved" && (
                            <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3 text-sm">
                              <p className="text-xs font-medium text-[var(--color-copper)]">
                                رد من الحرفي
                              </p>
                              <p className="mt-1 text-[var(--text-secondary)]">
                                {review.artisanReply.text}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
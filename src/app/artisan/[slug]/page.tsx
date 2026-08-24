"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../components/Header";
import Link from "next/link";
import { products as baseProducts } from "../../data/products";
import { getArtisanReviews } from "../../../lib/reviewUtils";

// تعريف شكل الحرفي
type Artisan = {
  id?: string;
  name: string;
  country: string;
  status: string;
  story?: string;
  video?: string; // رابط فيديو تعريفي
  profileImage?: string; // رابط صورة الحرفي
  craft?: string; // الحرفة الرئيسية
  region?: string; // المنطقة العامة (مثل: أخميم – سوهاج)
  createdAt: string;
};

// تعريف شكل المنتج
type Product = {
  slug: string;
  name: string;
  artisan: string;
  country: string;
  price: number;
  category: string;
  accent: "terracotta" | "olive" | "copper";
  status?: "pending" | "approved" | "rejected";
  imageNames?: string[];
};

// تعريف شكل التقييم
type Review = {
  id: string;
  productSlug: string;
  productName: string;
  artisanName: string;
  customerName: string;
  productRating: number;
  artisanRating: number;
  reviewText: string;
  createdAt: string;
  status: string;
};

export default function ArtisanProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [artisan, setArtisan] = useState<Artisan | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);

  useEffect(() => {
    // ١- جلب بيانات الحرفي من localStorage
    const artisans: Artisan[] = JSON.parse(
      localStorage.getItem("irth-artisans") || "[]"
    );
    const foundArtisan = artisans.find(
      (a) => a.name.toLowerCase().replace(/ /g, "-") === slug
    );

    if (!foundArtisan || foundArtisan.status === "Deactivated") {
      router.push("/404");
      return;
    }

    setArtisan(foundArtisan);

    // ٢- جلب منتجات الحرفي
    const storedProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );
    const baseProductsList = Object.values(baseProducts);
    const allProducts = [...baseProductsList, ...storedProducts];
    const artisanProducts = allProducts.filter(
      (p) =>
        p.artisan === foundArtisan.name &&
        (p.status === "approved" || !p.status)
    );
    setProducts(artisanProducts);

    // ٣- جلب تقييمات الحرفي
    const artisanReviews = getArtisanReviews(foundArtisan.name);
    setReviews(artisanReviews);

    // ٤- حساب متوسط تقييم الحرفي
    if (artisanReviews.length > 0) {
      const avg =
        artisanReviews.reduce((sum, r) => sum + r.artisanRating, 0) /
        artisanReviews.length;
      setAverageRating(avg);
    }

    setLoading(false);
  }, [slug, router]);

  // دالة إضافة للسلة (مؤقتة)
  const handleAddToCart = (product: Product) => {
    const cart = JSON.parse(localStorage.getItem("irth-cart") || "[]");
    const cartItem = {
      slug: product.slug,
      artisan: product.artisan,
      name: product.name,
      price: product.price,
    };
    cart.push(cartItem);
    localStorage.setItem("irth-cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("irth-cart-updated"));
    router.push("/cart");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري التحميل...</p>
        </div>
      </main>
    );
  }

  if (!artisan) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 flex-col items-center justify-center gap-4">
          <p className="text-xl text-[var(--text-secondary)]">الحرفي غير موجود</p>
          <Link href="/" className="text-[var(--color-copper)] hover:underline">
            العودة للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  // ألوان الخلفية حسب الـ accent
  const accentColors = {
    terracotta: "bg-[var(--color-terracotta)]",
    olive: "bg-[var(--color-olive)]",
    copper: "bg-[var(--color-copper)]",
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      {/* Hero Section: صورة الحرفي + معلوماته */}
      <section className="relative overflow-hidden bg-[var(--color-espresso)] text-[var(--color-ivory)]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-espresso)] to-[var(--color-copper)]" />
          <div className="absolute top-10 right-10 w-32 h-32 border border-[var(--color-copper)]/20 rounded-full" />
          <div className="absolute bottom-10 left-10 w-24 h-24 border border-[var(--color-copper)]/20 rotate-45" />
        </div>

        <div className="relative z-10 mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
          <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:gap-12">
            {/* صورة الحرفي (مؤقتة) */}
            <div className="h-32 w-32 shrink-0 rounded-full bg-[var(--color-copper)]/30 flex items-center justify-center text-5xl md:h-40 md:w-40">
              {artisan.profileImage ? (
                <img
                  src={artisan.profileImage}
                  alt={artisan.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-[var(--color-ivory)]/60">
                  {artisan.name.charAt(0)}
                </span>
              )}
            </div>

            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-copper)]">
                Artisan
              </p>
              <h1 className="mt-2 font-[var(--font-display)] text-4xl md:text-6xl leading-[1.05]">
                {artisan.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                <span className="text-[var(--color-ivory)]/70">
                  {artisan.craft || "حرفي"}
                </span>
                <span className="text-[var(--color-ivory)]/40">·</span>
                <span className="text-[var(--color-ivory)]/70">
                  {artisan.region || artisan.country}
                </span>
              </div>

              {/* متوسط التقييم */}
              {averageRating !== null && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-[var(--color-ivory)]">
                      {averageRating.toFixed(1)}
                    </span>
                    <span className="text-[var(--color-copper)]">
                      {'★'.repeat(Math.round(averageRating))}
                      {'☆'.repeat(5 - Math.round(averageRating))}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--color-ivory)]/50">
                    ({reviews.length} تقييمات)
                  </span>
                </div>
              )}

              {/* نبذة مختصرة */}
              {artisan.story && (
                <p className="mt-4 max-w-2xl text-sm text-[var(--color-ivory)]/70 leading-relaxed line-clamp-3">
                  {artisan.story}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* القسم: قصة الحرفي */}
      {artisan.story && (
        <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 border-b border-[var(--border-soft)]">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              The Story
            </p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl md:text-4xl text-[var(--color-espresso)]">
              رحلة {artisan.name}
            </h2>
            <div className="mt-6 space-y-4 text-[var(--text-secondary)] leading-relaxed">
              {artisan.story.split("\n").map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {artisan.video && (
              <div className="mt-6">
                <a
                  href={artisan.video}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-[var(--color-copper)] hover:underline"
                >
                  ▶️ Watch introduction video
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* القسم: منتجات الحرفي */}
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 border-b border-[var(--border-soft)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Products
            </p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl md:text-4xl text-[var(--color-espresso)]">
              منتجات {artisan.name}
            </h2>
          </div>
          {products.length > 0 && (
            <Link
              href="/crafts"
              className="text-sm text-[var(--color-copper)] hover:underline"
            >
              View all →
            </Link>
          )}
        </div>

        {products.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-8 text-center text-[var(--text-secondary)]">
            لا توجد منتجات لهذا الحرفي حالياً
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 9).map((product) => (
              <div
                key={product.slug}
                className="group rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] overflow-hidden transition hover:shadow-[var(--shadow-card)] hover:-translate-y-1"
              >
                <Link href={`/product/${product.slug}`}>
                  <div
                    className={`h-48 w-full ${accentColors[product.accent]}`}
                  />
                  <div className="p-5">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {product.category}
                    </p>
                    <h3 className="mt-1 font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
                      {product.name}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {product.country}
                    </p>
                    <p className="mt-2 font-medium text-[var(--color-copper)]">
                      ${product.price}
                    </p>
                  </div>
                </Link>
                <div className="border-t border-[var(--border-soft)] px-5 py-3">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-4 py-2 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
                  >
                    Add to cart 🛒
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* القسم: تقييمات الحرفي */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-6 py-16">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Reviews
            </p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl md:text-4xl text-[var(--color-espresso)]">
              تقييمات العملاء
            </h2>
          </div>

          <div className="mt-8 space-y-4">
            {reviews.slice(0, 10).map((review) => (
              <div
                key={review.id}
                className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[var(--color-espresso)]">
                      {review.customerName}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-[var(--color-copper)]">
                          {'★'.repeat(review.artisanRating)}
                          {'☆'.repeat(5 - review.artisanRating)}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(review.createdAt).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {review.status === "edited" && "🔄 تم التعديل"}
                  </div>
                </div>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  {review.reviewText}
                </p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  المنتج: {review.productName}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Navigation (للجوال) */}
      <nav className="bottom-nav md:hidden">
        <Link href="/" className="active">
          <span>🏠</span> Home
        </Link>
        <Link href="/search">
          <span>🔎</span> Search
        </Link>
        <Link href="/crafts">
          <span>🧭</span> Explore
        </Link>
        <Link href="/saved">
          <span>❤️</span> Saved
        </Link>
        <Link href="/account">
          <span>👤</span> Account
        </Link>
      </nav>
    </main>
  );
}
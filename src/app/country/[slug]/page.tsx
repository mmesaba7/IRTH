"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../components/Header";
import Link from "next/link";
import { products as baseProducts } from "../../data/products";

// تعريف شكل الدولة
type Country = {
  id: string;
  name: string;
  nameEn: string;
  slug: string;
  currency: string;
  currencySymbol: string;
  shippingCost: number;
  freeShippingThreshold: number;
  status: "active" | "inactive";
  // بيانات ثقافية (لصفحة العميل)
  heroImage?: string; // رابط الصورة الرئيسية
  culturalDescription?: string; // نبذة ثقافية عن الدولة
  culturalVideo?: string; // رابط فيديو تعريفي
  crafts?: string[]; // أسماء الحرف الرئيسية في الدولة
  featuredArtisans?: string[]; // أسماء حرفيين مميزين
  createdAt: string;
  updatedAt?: string;
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
};

// تعريف شكل الحرفي
type Artisan = {
  name: string;
  country: string;
  status: string;
  story?: string;
};

export default function CountryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState<Country | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [crafts, setCrafts] = useState<string[]>([]);

  useEffect(() => {
    // ١- جلب بيانات الدولة من localStorage
    const countries: Country[] = JSON.parse(
      localStorage.getItem("irth-countries") || "[]"
    );
    const foundCountry = countries.find((c) => c.slug === slug);

    if (!foundCountry || foundCountry.status === "inactive") {
      router.push("/404");
      return;
    }

    setCountry(foundCountry);

    // ٢- جلب المنتجات من localStorage والملف الأساسي
    const storedProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );
    const baseProductsList = Object.values(baseProducts);

    // فلترة المنتجات حسب الدولة (بشرط أن تكون معتمدة)
    const allProducts = [...baseProductsList, ...storedProducts];
    const countryProducts = allProducts.filter(
      (p) =>
        p.country === foundCountry.name &&
        (p.status === "approved" || !p.status) // المنتجات الأساسية ملهاش status
    );
    setProducts(countryProducts);

    // ٣- جلب الحرفيين من localStorage
    const allArtisans: Artisan[] = JSON.parse(
      localStorage.getItem("irth-artisans") || "[]"
    );
    const countryArtisans = allArtisans.filter(
      (a) =>
        a.country === foundCountry.name &&
        (a.status === "Active" || a.status === "Pending Verification")
    );
    setArtisans(countryArtisans);

    // ٤- جلب الحرف من بيانات الدولة (لو موجودة) وإلا نستخرجها من المنتجات
    if (foundCountry.crafts && foundCountry.crafts.length > 0) {
      setCrafts(foundCountry.crafts);
    } else {
      const uniqueCrafts = [
        ...new Set(countryProducts.map((p) => p.category)),
      ].filter(Boolean);
      setCrafts(uniqueCrafts);
    }

    setLoading(false);
  }, [slug, router]);

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

  if (!country) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 flex-col items-center justify-center gap-4">
          <p className="text-xl text-[var(--text-secondary)]">الدولة غير موجودة</p>
          <Link href="/" className="text-[var(--color-copper)] hover:underline">
            العودة للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      {/* Hero Section: صورة رئيسية + نبذة ثقافية */}
      <section className="relative overflow-hidden bg-[var(--color-espresso)] text-[var(--color-ivory)]">
        {/* خلفية الصورة (مؤقتة) */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-espresso)] to-[var(--color-copper)]" />
          <div className="absolute top-10 right-10 w-32 h-32 border border-[var(--color-copper)]/20 rounded-full" />
          <div className="absolute bottom-10 left-10 w-24 h-24 border border-[var(--color-copper)]/20 rotate-45" />
        </div>

        <div className="relative z-10 mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-copper)]">
              Explore
            </p>
            <h1 className="mt-4 font-[var(--font-display)] text-5xl md:text-7xl leading-[1.05]">
              {country.name}
            </h1>
            <p className="mt-2 text-lg text-[var(--color-ivory)]/60">
              {country.nameEn}
            </p>

            {/* النبذة الثقافية */}
            {country.culturalDescription && (
              <p className="mt-6 max-w-2xl text-base md:text-lg text-[var(--color-ivory)]/80 leading-relaxed">
                {country.culturalDescription}
              </p>
            )}

            {/* الفيديو التعريفي */}
            {country.culturalVideo && (
              <div className="mt-6">
                <a
                  href={country.culturalVideo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-[var(--color-copper)] hover:underline"
                >
                  ▶️ Watch introduction video
                </a>
              </div>
            )}

            {/* إحصائيات سريعة */}
            <div className="mt-8 flex flex-wrap gap-8">
              <div>
                <p className="text-2xl font-bold text-[var(--color-copper)]">
                  {products.length}
                </p>
                <p className="text-sm text-[var(--color-ivory)]/60">
                  منتجات حرفية
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-copper)]">
                  {artisans.length}
                </p>
                <p className="text-sm text-[var(--color-ivory)]/60">
                  حرفي وحرفية
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-copper)]">
                  {crafts.length}
                </p>
                <p className="text-sm text-[var(--color-ivory)]/60">
                  حرفة رئيسية
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* قسم: الحرف الرئيسية */}
      {crafts.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-6 py-16">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
                Crafts
              </p>
              <h2 className="mt-2 font-[var(--font-display)] text-3xl md:text-4xl text-[var(--color-espresso)]">
                حرف {country.name}
              </h2>
            </div>
            <Link
              href="/crafts"
              className="text-sm text-[var(--color-copper)] hover:underline"
            >
              View all →
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {crafts.map((craft) => (
              <Link
                key={craft}
                href={`/crafts?category=${craft}`}
                className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-3 text-sm font-medium text-[var(--color-espresso)] transition hover:border-[var(--color-copper)] hover:text-[var(--color-copper)]"
              >
                {craft}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* قسم: حرفيين مميزين */}
      {artisans.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 border-t border-[var(--border-soft)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
                Artisans
              </p>
              <h2 className="mt-2 font-[var(--font-display)] text-3xl md:text-4xl text-[var(--color-espresso)]">
                حرفيو {country.name}
              </h2>
            </div>
            <Link
              href="/artisans"
              className="text-sm text-[var(--color-copper)] hover:underline"
            >
              View all →
            </Link>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {artisans.slice(0, 6).map((artisan) => (
              <div
                key={artisan.name}
                className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 transition hover:shadow-[var(--shadow-card)]"
              >
                <p className="font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
                  {artisan.name}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {artisan.country}
                </p>
                {artisan.story && (
                  <p className="mt-2 text-sm text-[var(--text-muted)] line-clamp-2">
                    {artisan.story}
                  </p>
                )}
                <Link
                  href={`/artisan/${artisan.name.toLowerCase().replace(/ /g, "-")}`}
                  className="mt-4 inline-block text-sm text-[var(--color-copper)] hover:underline"
                >
                  View profile →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* قسم: منتجات مختارة */}
      {products.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 border-t border-[var(--border-soft)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
                Products
              </p>
              <h2 className="mt-2 font-[var(--font-display)] text-3xl md:text-4xl text-[var(--color-espresso)]">
                منتجات مختارة من {country.name}
              </h2>
            </div>
            <Link
              href="/crafts"
              className="text-sm text-[var(--color-copper)] hover:underline"
            >
              View all →
            </Link>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 6).map((product) => (
              <Link
                key={product.slug}
                href={`/product/${product.slug}`}
                className="group rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] overflow-hidden transition hover:shadow-[var(--shadow-card)] hover:-translate-y-1"
              >
                <div
                  className={`h-48 w-full ${
                    product.accent === "olive"
                      ? "bg-[var(--color-olive)]"
                      : product.accent === "copper"
                      ? "bg-[var(--color-copper)]"
                      : "bg-[var(--color-terracotta)]"
                  }`}
                />
                <div className="p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {product.category}
                  </p>
                  <h3 className="mt-1 font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
                    {product.name}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    By {product.artisan}
                  </p>
                  <p className="mt-2 font-medium text-[var(--color-copper)]">
                    ${product.price}
                  </p>
                </div>
              </Link>
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
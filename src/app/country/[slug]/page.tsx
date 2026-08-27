"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import Header from "../../components/Header";
import ProductCard from "../../components/ProductCard";

import {
  publicCountries,
  type PublicCountry,
} from "../../data/countries";

import {
  artisans as baseArtisans,
  type PublicArtisan,
} from "../../data/artisans";

import {
  products as baseProducts,
  type Product,
} from "../../data/products";

type PrototypeArtisanRecord = {
  name: string;
  status?: string;
};
type PrototypeMarketRecord = {
  slug?: string;
  countrySlug?: string;
  status?: "active" | "inactive";
};
export default function CountryPage() {
  const params = useParams();
  const router = useRouter();

  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);

  const [country, setCountry] = useState<PublicCountry | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [artisans, setArtisans] = useState<PublicArtisan[]>([]);
  const [crafts, setCrafts] = useState<string[]>([]);

  useEffect(() => {
    // 1. Public Country
    // المصدر الأساسي لبيانات الدولة التي يراها العميل.
    const publicCountry = publicCountries[slug];

    if (!publicCountry) {
      router.push("/404");
      return;
    }

    // 2. Market / operational status
    // localStorage مؤقت في الـPrototype.
    // لا نأخذ منه المحتوى الثقافي.
    const storedMarkets: PrototypeMarketRecord[] = JSON.parse(
  localStorage.getItem("irth-countries") || "[]"
);

    const marketRecord = storedMarkets.find(
      (market) => market.countrySlug === slug || market.slug === slug
    );

    // لو الدولة متوقفة كسوق بشكل صريح، لا نعرضها حاليًا.
    // عدم وجود Market record لا يمنع عرض المحتوى الثقافي.
    if (marketRecord?.status === "inactive") {
      router.push("/404");
      return;
    }

    setCountry(publicCountry);

    // 3. Products
    const storedProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );

    const baseProductsList: Product[] = Object.values(baseProducts);

    const allProducts: Product[] = [
      ...baseProductsList,
      ...storedProducts,
    ];

    // إزالة أي تكرار حسب slug.
    const uniqueProducts = allProducts.filter(
      (product, index, self) =>
        product.slug &&
        index ===
          self.findIndex(
            (candidate) => candidate.slug === product.slug
          )
    );

    // نستخدم الاسم الإنجليزي أيضًا لأن المنتجات الحالية
    // مخزنة مثل Egypt وليس مصر.
    const countryProducts = uniqueProducts.filter((product) => {
      const belongsToCountry =
        product.country === publicCountry.nameEn ||
        product.country === publicCountry.name;

      const isVisible =
        product.status === "approved" || !product.status;

      return belongsToCountry && isVisible;
    });

    // لو عندنا Featured Product Slugs معتمدة، نعرضها أولاً.
    const featuredProducts =
      publicCountry.featuredProductSlugs.length > 0
        ? publicCountry.featuredProductSlugs
            .map((productSlug) =>
              countryProducts.find(
                (product) => product.slug === productSlug
              )
            )
            .filter(
              (product): product is Product =>
                Boolean(product)
            )
        : countryProducts;

    setProducts(featuredProducts);

    // 4. Public Artisans
    const publicArtisans = Object.values(baseArtisans);

    // البيانات التشغيلية المؤقتة للحرفيين.
    // لا نعرض منها Email أو Phone أو أي بيانات حساسة.
    const storedArtisans: PrototypeArtisanRecord[] = JSON.parse(
      localStorage.getItem("irth-artisans") || "[]"
    );

    const countryArtisans = publicArtisans.filter((artisan) => {
      const belongsToCountry =
        artisan.country === publicCountry.nameEn ||
        artisan.country === publicCountry.name;

      if (!belongsToCountry) {
        return false;
      }

      const operationalRecord = storedArtisans.find(
        (storedArtisan) =>
          storedArtisan.name.toLowerCase() ===
          artisan.name.toLowerCase()
      );

      return operationalRecord?.status !== "Deactivated";
    });

    // لو الدولة محددة حرفيين مميزين، نستخدمهم.
    // وإلا نعرض الحرفيين المتاحين في الدولة.
    const featuredArtisans =
      publicCountry.featuredArtisanSlugs.length > 0
        ? publicCountry.featuredArtisanSlugs
            .map((artisanSlug) =>
              countryArtisans.find(
                (artisan) => artisan.slug === artisanSlug
              )
            )
            .filter(
              (artisan): artisan is PublicArtisan =>
                Boolean(artisan)
            )
        : countryArtisans;

    setArtisans(featuredArtisans);

    // 5. Crafts
    // نفضل الحرف المحددة في PublicCountry.
    // ولو مش موجودة نستخرجها من المنتجات والحرفيين.
    if (publicCountry.crafts.length > 0) {
      setCrafts(publicCountry.crafts);
    } else {
      const productCrafts = countryProducts.map(
        (product) => product.category
      );

      const artisanCrafts = countryArtisans.map(
        (artisan) => artisan.mainCraft
      );

      const uniqueCrafts = [
        ...new Set([...productCrafts, ...artisanCrafts]),
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
          <p className="text-[var(--text-secondary)]">
            جاري تحميل الدولة...
          </p>
        </div>
      </main>
    );
  }

  if (!country) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />

        <div className="flex h-96 flex-col items-center justify-center gap-4">
          <p className="text-xl text-[var(--text-secondary)]">
            الدولة غير موجودة
          </p>

          <Link
            href="/"
            className="text-[var(--color-copper)] hover:underline"
          >
            العودة للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--color-espresso)] text-[var(--color-ivory)]">
        {country.heroImage ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{
              backgroundImage: `url("${country.heroImage}")`,
            }}
          />
        ) : (
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-espresso)] to-[var(--color-copper)]" />

            <div className="absolute right-10 top-10 h-32 w-32 rounded-full border border-[var(--color-copper)]/20" />

            <div className="absolute bottom-10 left-10 h-24 w-24 rotate-45 border border-[var(--color-copper)]/20" />
          </div>
        )}

        <div className="absolute inset-0 bg-[var(--color-espresso)]/35" />

        <div className="relative z-10 mx-auto max-w-[var(--container-max)] px-5 py-16 md:px-6 md:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-copper)]">
              Explore
            </p>

            <h1 className="mt-4 font-[var(--font-display)] text-5xl leading-[1.05] md:text-7xl">
              {country.name}
            </h1>

            <p className="mt-2 text-lg text-[var(--color-ivory)]/60">
              {country.nameEn}
            </p>

            {country.culturalDescription && (
              <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-ivory)]/80 md:text-lg">
                {country.culturalDescription}
              </p>
            )}

            {country.culturalVideo && (
              <div className="mt-7">
                <a
                  href={country.culturalVideo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ivory)]/20 px-5 py-2.5 text-sm font-medium text-[var(--color-ivory)] transition-colors hover:border-[var(--color-copper)] hover:text-[var(--color-copper)]"
                >
                  <span>▶</span>
                  Watch introduction video
                </a>
              </div>
            )}

            <div className="mt-10 flex flex-wrap gap-8 border-t border-[var(--color-ivory)]/10 pt-7">
              <div>
                <p className="text-2xl font-semibold text-[var(--color-copper)]">
                  {products.length}
                </p>

                <p className="mt-1 text-sm text-[var(--color-ivory)]/60">
                  منتجات حرفية
                </p>
              </div>

              <div>
                <p className="text-2xl font-semibold text-[var(--color-copper)]">
                  {artisans.length}
                </p>

                <p className="mt-1 text-sm text-[var(--color-ivory)]/60">
                  حرفي وحرفية
                </p>
              </div>

              <div>
                <p className="text-2xl font-semibold text-[var(--color-copper)]">
                  {crafts.length}
                </p>

                <p className="mt-1 text-sm text-[var(--color-ivory)]/60">
                  حرفة رئيسية
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Crafts */}
      {crafts.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
                Crafts
              </p>

              <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">
                حرف {country.name}
              </h2>
            </div>

            <Link
              href="/crafts"
              className="shrink-0 text-sm font-medium text-[var(--color-copper)] hover:underline"
            >
              View all →
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {crafts.map((craft) => (
              <Link
                key={craft}
                href={`/crafts?category=${encodeURIComponent(craft)}`}
                className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--color-espresso)] transition-colors hover:border-[var(--color-copper)] hover:text-[var(--color-copper)]"
              >
                {craft}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Artisans */}
      {artisans.length > 0 && (
        <section className="border-t border-[var(--border-soft)] bg-[var(--surface)]">
          <div className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
                  Artisans
                </p>

                <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">
                  حرفيو {country.name}
                </h2>
              </div>

              <Link
                href="/artisans"
                className="shrink-0 text-sm font-medium text-[var(--color-copper)] hover:underline"
              >
                View all →
              </Link>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {artisans.slice(0, 6).map((artisan) => (
                <article
                  key={artisan.slug}
                  className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--background)] transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-olive)]">
                    {artisan.profileImage ? (
                      <img
                        src={artisan.profileImage}
                        alt={artisan.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute left-8 top-8 h-20 w-20 rounded-full border border-[var(--color-ivory)]/40" />

                          <div className="absolute bottom-10 right-10 h-14 w-14 rotate-45 border border-[var(--color-ivory)]/25" />
                        </div>

                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[var(--color-ivory)]/90 px-4 text-center shadow-lg">
                            <span className="text-sm font-medium text-[var(--color-espresso)]">
                              {artisan.name}
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="absolute bottom-4 left-4 rounded-full bg-[var(--surface)]/90 px-3 py-1.5 text-xs font-medium text-[var(--color-espresso)] backdrop-blur-sm">
                      {artisan.mainCraft}
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {artisan.country} · {artisan.region}
                    </p>

                    <h3 className="mt-2 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                      {artisan.name}
                    </h3>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">
                      {artisan.bio}
                    </p>

                    <div className="mt-5 flex items-center justify-between gap-4 border-t border-[var(--border-soft)] pt-4">
                      <p className="text-sm text-[var(--text-secondary)]">
                        ★ {artisan.rating.toFixed(1)}

                        <span className="ml-1 text-[var(--text-muted)]">
                          ({artisan.reviewCount})
                        </span>
                      </p>

                      <Link
                        href={`/artisan/${artisan.slug}`}
                        className="text-sm font-medium text-[var(--color-copper)] transition-colors hover:text-[var(--color-espresso)]"
                      >
                        View artisan →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products */}
      {products.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
                Products
              </p>

              <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">
                منتجات مختارة من {country.name}
              </h2>
            </div>

            <Link
              href="/crafts"
              className="shrink-0 text-sm font-medium text-[var(--color-copper)] hover:underline"
            >
              View all →
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 6).map((product) => (
              <ProductCard
                key={product.slug}
                product={product}
              />
            ))}
          </div>
        </section>
      )}

      {/*
        Related cultural articles are Architecture Later.

        country.relatedArticleSlugs is already available in PublicCountry,
        so later we can connect this page to a Content/Article module
        without redesigning the Country model.

        We intentionally do not render broken article links before
        the Content module exists.
      */}

      {/* Mobile Navigation */}
      <nav className="bottom-nav md:hidden">
        <Link href="/">
          <span>🏠</span>
          Home
        </Link>

        <Link href="/search">
          <span>🔎</span>
          Search
        </Link>

        <Link href="/crafts" className="active">
          <span>🧭</span>
          Explore
        </Link>

        <Link href="/saved">
          <span>❤️</span>
          Saved
        </Link>

        <Link href="/account">
          <span>👤</span>
          Account
        </Link>
      </nav>
    </main>
  );
}
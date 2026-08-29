"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import Header from "../../components/Header";
import ProductCard from "../../components/ProductCard";
import type { Product } from "../../data/products";
import { createClient } from "@/lib/supabase/client";
import { getArtisanReviews } from "../../../lib/reviewUtils";

type ArtisanProfileRow = {
  id: string;
  slug: string;
  name_ar: string | null;
  name_en: string;
  country_id: string;
  region_ar: string | null;
  region_en: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  story_ar: string | null;
  story_en: string | null;
  primary_craft_id: string;
  profile_image_url: string | null;
  video_url: string | null;
};

type CountryRow = {
  id: string;
  name_ar: string;
  name_en: string;
};

type CraftRow = {
  id: string;
  name_ar: string;
  name_en: string;
};

type ArtisanCraftRow = {
  craft_id: string;
};

type ProductRow = {
  slug: string;
  artisan_id: string;
  primary_craft_id: string;
  name_ar: string | null;
  name_en: string;
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
};

type Review = {
  id: string;
  productName: string;
  customerName: string;
  artisanRating: number;
  reviewText: string;
  createdAt: string;
  status: string;
};

type PublicArtisanView = {
  id: string;
  slug: string;
  name: string;
  country: string;
  region: string;
  mainCraft: string;
  additionalCrafts: string[];
  bio: string;
  story: string;
  profileImage: string | null;
  video: string | null;
};

export default function ArtisanProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [artisan, setArtisan] = useState<PublicArtisanView | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);

  useEffect(() => {
    const loadArtisan = async () => {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const { data: artisanData, error: artisanError } = await supabase
        .from("artisan_profiles")
        .select(
          "id, slug, name_ar, name_en, country_id, region_ar, region_en, bio_ar, bio_en, story_ar, story_en, primary_craft_id, profile_image_url, video_url"
        )
        .eq("slug", slug)
        .maybeSingle();

      if (artisanError) {
        console.error("Could not load artisan profile:", artisanError);
        setError("تعذر تحميل بيانات الحرفي.");
        setLoading(false);
        return;
      }

      if (!artisanData) {
        router.replace("/404");
        return;
      }

      const artisanRow = artisanData as ArtisanProfileRow;

      const [countryResult, primaryCraftResult, artisanCraftsResult, productsResult] =
        await Promise.all([
          supabase
            .from("countries")
            .select("id, name_ar, name_en")
            .eq("id", artisanRow.country_id)
            .maybeSingle(),
          supabase
            .from("crafts")
            .select("id, name_ar, name_en")
            .eq("id", artisanRow.primary_craft_id)
            .maybeSingle(),
          supabase
            .from("artisan_crafts")
            .select("craft_id")
            .eq("artisan_id", artisanRow.id),
          supabase
            .from("products")
            .select(
              "slug, artisan_id, primary_craft_id, name_ar, name_en, description_ar, description_en, story_ar, story_en, material_ar, material_en, price, dimensions, weight, made_to_order, preparation_time, one_of_a_kind, customization"
            )
            .eq("artisan_id", artisanRow.id)
            .eq("lifecycle_status", "published")
            .order("created_at", { ascending: false }),
        ]);

      if (countryResult.error || primaryCraftResult.error || artisanCraftsResult.error || productsResult.error) {
        console.error("Could not load artisan public relations:", {
          country: countryResult.error,
          craft: primaryCraftResult.error,
          artisanCrafts: artisanCraftsResult.error,
          products: productsResult.error,
        });
        setError("تعذر تحميل الصفحة العامة للحرفي بالكامل.");
        setLoading(false);
        return;
      }

      const country = countryResult.data as CountryRow | null;
      const primaryCraft = primaryCraftResult.data as CraftRow | null;
      const artisanCraftRows = (artisanCraftsResult.data ?? []) as ArtisanCraftRow[];
      const craftIds = [
        ...new Set(
          artisanCraftRows
            .map((row) => row.craft_id)
            .filter((id) => id !== artisanRow.primary_craft_id)
        ),
      ];

      let additionalCrafts: CraftRow[] = [];
      if (craftIds.length > 0) {
        const { data, error: craftsError } = await supabase
          .from("crafts")
          .select("id, name_ar, name_en")
          .in("id", craftIds);

        if (craftsError) {
          console.error("Could not load additional crafts:", craftsError);
        } else {
          additionalCrafts = (data ?? []) as CraftRow[];
        }
      }

      const publicArtisan: PublicArtisanView = {
        id: artisanRow.id,
        slug: artisanRow.slug,
        name: artisanRow.name_ar || artisanRow.name_en,
        country: country?.name_ar || country?.name_en || "",
        region: artisanRow.region_ar || artisanRow.region_en || country?.name_ar || "",
        mainCraft: primaryCraft?.name_ar || primaryCraft?.name_en || "",
        additionalCrafts: additionalCrafts.map((craft) => craft.name_ar || craft.name_en),
        bio: artisanRow.bio_ar || artisanRow.bio_en || "",
        story: artisanRow.story_ar || artisanRow.story_en || "",
        profileImage: artisanRow.profile_image_url,
        video: artisanRow.video_url,
      };

      const craftMap = new Map<string, CraftRow>();
      if (primaryCraft) craftMap.set(primaryCraft.id, primaryCraft);
      additionalCrafts.forEach((craft) => craftMap.set(craft.id, craft));

      const missingCraftIds = [
        ...new Set(
          ((productsResult.data ?? []) as ProductRow[])
            .map((product) => product.primary_craft_id)
            .filter((id) => !craftMap.has(id))
        ),
      ];

      if (missingCraftIds.length > 0) {
        const { data: missingCrafts } = await supabase
          .from("crafts")
          .select("id, name_ar, name_en")
          .in("id", missingCraftIds);
        ((missingCrafts ?? []) as CraftRow[]).forEach((craft) =>
          craftMap.set(craft.id, craft)
        );
      }

      const accents: Product["accent"][] = ["terracotta", "olive", "copper"];
      const mappedProducts: Product[] = ((productsResult.data ?? []) as ProductRow[]).map(
        (product, index) => {
          const craft = craftMap.get(product.primary_craft_id);
          const craftName = craft?.name_ar || craft?.name_en || publicArtisan.mainCraft;

          return {
            slug: product.slug,
            artisanSlug: publicArtisan.slug,
            name: product.name_ar || product.name_en,
            artisan: publicArtisan.name,
            country: publicArtisan.country,
            price: Number(product.price),
            category: craftName,
            accent: accents[index % accents.length],
            origin: publicArtisan.region,
            artisanRole: `${craftName} artisan`,
            objectLabel: craftName || "Handmade product",
            description: product.description_ar || product.description_en || "",
            material: product.material_ar || product.material_en || "",
            story: product.story_ar || product.story_en || "",
            status: "approved",
            dimensions: product.dimensions || undefined,
            weight: product.weight || undefined,
            madeToOrder: product.made_to_order,
            preparationTime: product.preparation_time || undefined,
            oneOfAKind: product.one_of_a_kind,
            customization: product.customization,
          };
        }
      );

      setArtisan(publicArtisan);
      setProducts(mappedProducts);

      // Reviews are still on the prototype storage layer. They are not part of S14.1's
      // artisan/product source-of-truth migration because no reviews table exists yet.
      const artisanReviews = getArtisanReviews(artisanRow.name_en) as Review[];
      setReviews(artisanReviews);

      if (artisanReviews.length > 0) {
        const average =
          artisanReviews.reduce((sum, review) => sum + review.artisanRating, 0) /
          artisanReviews.length;
        setAverageRating(average);
      } else {
        setAverageRating(null);
      }

      setLoading(false);
    };

    loadArtisan();
  }, [slug, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري تحميل الحرفي...</p>
        </div>
      </main>
    );
  }

  if (!artisan) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-xl text-[var(--text-secondary)]">
            {error || "الحرفي غير موجود"}
          </p>
          <Link href="/" className="text-[var(--color-copper)] hover:underline">
            العودة للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      <section className="relative overflow-hidden bg-[var(--color-espresso)] text-[var(--color-ivory)]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-espresso)] to-[var(--color-copper)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
          <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:gap-12">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-copper)]/30 text-5xl md:h-40 md:w-40">
              {artisan.profileImage ? (
                <img
                  src={artisan.profileImage}
                  alt={artisan.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[var(--color-ivory)]/60">{artisan.name.charAt(0)}</span>
              )}
            </div>

            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-copper)]">
                Artisan
              </p>
              <h1 className="mt-2 font-[var(--font-display)] text-4xl leading-[1.05] md:text-6xl">
                {artisan.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--color-ivory)]/70">
                <span>{artisan.mainCraft}</span>
                <span className="text-[var(--color-ivory)]/40">·</span>
                <span>{artisan.region || artisan.country}</span>
              </div>

              {artisan.additionalCrafts.length > 0 && (
                <p className="mt-2 text-xs text-[var(--color-ivory)]/50">
                  حرف إضافية: {artisan.additionalCrafts.join(" · ")}
                </p>
              )}

              {averageRating !== null && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
                  <span className="text-[var(--color-copper)]">
                    {"★".repeat(Math.round(averageRating))}
                    {"☆".repeat(5 - Math.round(averageRating))}
                  </span>
                  <span className="text-xs text-[var(--color-ivory)]/50">
                    ({reviews.length} تقييمات)
                  </span>
                </div>
              )}

              {artisan.bio && (
                <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[var(--color-ivory)]/75">
                  {artisan.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {artisan.story && (
        <section className="mx-auto max-w-[var(--container-max)] border-b border-[var(--border-soft)] px-6 py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              The Story
            </p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-4xl">
              رحلة {artisan.name}
            </h2>
            <div className="mt-6 space-y-4 leading-relaxed text-[var(--text-secondary)]">
              {artisan.story.split("\n").map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {artisan.video && (
              <a
                href={artisan.video}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--color-copper)] hover:underline"
              >
                ▶ مشاهدة الفيديو التعريفي
              </a>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[var(--container-max)] border-b border-[var(--border-soft)] px-6 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Products
            </p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-4xl">
              منتجات {artisan.name}
            </h2>
          </div>
          {products.length > 0 && (
            <Link href="/crafts" className="text-sm text-[var(--color-copper)] hover:underline">
              View all →
            </Link>
          )}
        </div>

        {products.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-8 text-center text-[var(--text-secondary)]">
            لا توجد منتجات منشورة لهذا الحرفي حاليًا
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 9).map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        )}
      </section>

      {reviews.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-6 py-16">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
            Reviews
          </p>
          <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-4xl">
            تقييمات العملاء
          </h2>

          <div className="mt-8 space-y-4">
            {reviews.slice(0, 10).map((review) => (
              <article
                key={review.id}
                className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-[var(--color-espresso)]">{review.customerName}</p>
                    <p className="mt-1 text-sm text-[var(--color-copper)]">
                      {"★".repeat(review.artisanRating)}
                      {"☆".repeat(5 - review.artisanRating)}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(review.createdAt).toLocaleDateString("ar-EG")}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">{review.reviewText}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">المنتج: {review.productName}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

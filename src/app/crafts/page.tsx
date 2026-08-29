"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import Link from "next/link";
import type { Product } from "../data/products";
import { createClient } from "@/lib/supabase/client";

type DbProduct = {
  id: string;
  slug: string;
  artisan_id: string;
  primary_craft_id: string;
  name_en: string | null;
  description_en: string | null;
  material_en: string | null;
  story_en: string | null;
  price: number | string;
  dimensions: string | null;
  weight: string | null;
  made_to_order: boolean;
  preparation_time: string | null;
  one_of_a_kind: boolean;
  customization: boolean;
};

type ArtisanRow = {
  id: string;
  slug: string;
  name_en: string | null;
  country_id: string | null;
  region_en: string | null;
};

type CraftRow = {
  id: string;
  name_en: string | null;
};

type CountryRow = {
  id: string;
  name_en: string | null;
};

export default function CraftsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const loadPublishedProducts = async () => {
      const supabase = createClient();

      const { data: productRows, error: productsError } = await supabase
        .from("products")
        .select(
          "id, slug, artisan_id, primary_craft_id, name_en, description_en, material_en, story_en, price, dimensions, weight, made_to_order, preparation_time, one_of_a_kind, customization"
        )
        .eq("lifecycle_status", "published")
        .order("created_at", { ascending: false });

      if (productsError) {
        console.error("Could not load published products:", productsError);
        setError("تعذر تحميل المنتجات المنشورة.");
        setLoading(false);
        return;
      }

      const rows = (productRows ?? []) as DbProduct[];

      if (rows.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const artisanIds = [...new Set(rows.map((row) => row.artisan_id))];
      const craftIds = [...new Set(rows.map((row) => row.primary_craft_id))];

      const [{ data: artisansData }, { data: craftsData }] = await Promise.all([
        supabase
          .from("artisan_profiles")
          .select("id, slug, name_en, country_id, region_en")
          .eq("status", "active")
          .in("id", artisanIds),
        supabase
          .from("crafts")
          .select("id, name_en")
          .in("id", craftIds),
      ]);

      const artisans = (artisansData ?? []) as ArtisanRow[];
      const crafts = (craftsData ?? []) as CraftRow[];
      const countryIds = [
        ...new Set(
          artisans
            .map((artisan) => artisan.country_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      let countries: CountryRow[] = [];
      if (countryIds.length > 0) {
        const { data: countriesData } = await supabase
          .from("countries")
          .select("id, name_en")
          .in("id", countryIds);
        countries = (countriesData ?? []) as CountryRow[];
      }

      const artisanMap = new Map(artisans.map((row) => [row.id, row]));
      const craftMap = new Map(crafts.map((row) => [row.id, row]));
      const countryMap = new Map(countries.map((row) => [row.id, row]));
      const visibleRows = rows.filter((row) => artisanMap.has(row.artisan_id));

      const mappedProducts: Product[] = visibleRows.map((row, index) => {
        const artisan = artisanMap.get(row.artisan_id);
        const craft = craftMap.get(row.primary_craft_id);
        const country = artisan?.country_id
          ? countryMap.get(artisan.country_id)
          : undefined;
        const accents: Product["accent"][] = ["terracotta", "olive", "copper"];

        return {
          slug: row.slug,
          artisanSlug: artisan?.slug ?? "artisan",
          name: row.name_en || row.slug,
          artisan: artisan?.name_en || "IRTH Artisan",
          country: country?.name_en || "",
          price: Number(row.price),
          category: craft?.name_en || "Craft",
          accent: accents[index % accents.length],
          origin: artisan?.region_en || country?.name_en || "",
          artisanRole: `${craft?.name_en || "Craft"} artisan`,
          objectLabel: craft?.name_en || "Handmade product",
          description: row.description_en || "",
          material: row.material_en || "",
          story: row.story_en || "",
          status: "approved",
          dimensions: row.dimensions || undefined,
          weight: row.weight || undefined,
          madeToOrder: row.made_to_order,
          preparationTime: row.preparation_time || undefined,
          oneOfAKind: row.one_of_a_kind,
          customization: row.customization,
        };
      });

      setProducts(mappedProducts);

      const searchParams = new URLSearchParams(window.location.search);
      const categoryFromUrl = searchParams.get("category");
      if (categoryFromUrl) {
        const matchingCategory = mappedProducts.find(
          (product) =>
            product.category.toLowerCase() === categoryFromUrl.toLowerCase()
        )?.category;
        if (matchingCategory) setSelectedCategory(matchingCategory);
      }

      setLoading(false);
    };

    loadPublishedProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(search) ||
        product.artisan.toLowerCase().includes(search) ||
        product.country.toLowerCase().includes(search);
      const matchesCategory =
        selectedCategory === "all" || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const categories = ["all", ...new Set(products.map((p) => p.category))];

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري تحميل المنتجات...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] pb-24">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Explore
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl md:text-5xl text-[var(--color-espresso)]">
              All Crafts
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              Discover authentic handmade pieces from our artisans
            </p>
          </div>
          <span className="text-sm text-[var(--text-muted)]">
            {filteredProducts.length} products
          </span>
        </div>

        {error && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4 rounded-[var(--radius-lg)] bg-[var(--surface)] p-5 border border-[var(--border-soft)] sm:flex-row sm:items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, artisan, or country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-copper)]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-[var(--color-espresso)] text-[var(--color-ivory)]"
                    : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
                }`}
              >
                {category === "all" ? "All" : category}
              </button>
            ))}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="mt-16 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">No published products found</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        )}
      </section>

      <nav className="bottom-nav md:hidden">
        <Link href="/" className="active"><span>🏠</span> Home</Link>
        <Link href="/search"><span>🔎</span> Search</Link>
        <Link href="/crafts"><span>🧭</span> Explore</Link>
        <Link href="/saved"><span>❤️</span> Saved</Link>
        <Link href="/account"><span>👤</span> Account</Link>
      </nav>
    </main>
  );
}

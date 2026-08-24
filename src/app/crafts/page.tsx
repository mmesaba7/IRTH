"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import Link from "next/link";
import { products as baseProducts } from "../data/products";

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
};

export default function CraftsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const baseProductsList = Object.values(baseProducts);
    const storedProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    ).filter((p) => p.status === "approved");

    const allProducts = [...baseProductsList, ...storedProducts];
    const uniqueProducts = allProducts.filter(
      (product, index, self) =>
        index === self.findIndex((p) => p.slug === product.slug)
    );

    setProducts(uniqueProducts);
    setLoading(false);
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      product.artisan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.country.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

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
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-muted)]">
              {filteredProducts.length} products
            </span>
          </div>
        </div>

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
            <p className="text-lg text-[var(--text-secondary)]">
              🎉 No products found
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Try adjusting your search or filter
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.slug} slug={product.slug} />
            ))}
          </div>
        )}
      </section>

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
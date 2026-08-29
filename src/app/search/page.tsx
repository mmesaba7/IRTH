"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import {
  loadPublicMarketplaceCatalog,
  type PublicCatalogArtisan,
  type PublicCatalogCountry,
  type PublicCatalogCraft,
  type PublicCatalogProduct,
} from "@/lib/publicMarketplace";

type Ranked<T> = { item: T; score: number };

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getMatchScore(query: string, values: string[]) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return 0;

  let bestScore = 0;
  for (const value of values) {
    const normalizedValue = normalize(value);
    if (!normalizedValue) continue;
    if (normalizedValue === normalizedQuery) bestScore = Math.max(bestScore, 100);
    else if (normalizedValue.startsWith(normalizedQuery)) bestScore = Math.max(bestScore, 70);
    else if (normalizedValue.includes(normalizedQuery)) bestScore = Math.max(bestScore, 40);
  }
  return bestScore;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<PublicCatalogProduct[]>([]);
  const [artisans, setArtisans] = useState<PublicCatalogArtisan[]>([]);
  const [countries, setCountries] = useState<PublicCatalogCountry[]>([]);
  const [crafts, setCrafts] = useState<PublicCatalogCraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const catalog = await loadPublicMarketplaceCatalog();
        if (cancelled) return;
        setProducts(catalog.products);
        setArtisans(catalog.artisans);
        setCountries(catalog.countries);
        setCrafts(catalog.crafts);
      } catch (loadError) {
        console.error("Could not load public search catalog:", loadError);
        if (!cancelled) setError("تعذر تحميل البحث حاليًا.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const productResults = useMemo<Ranked<PublicCatalogProduct>[]>(() => {
    if (!query.trim()) return [];
    return products
      .map((item) => ({ item, score: getMatchScore(query, item.searchTerms) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [products, query]);

  const artisanResults = useMemo<Ranked<PublicCatalogArtisan>[]>(() => {
    if (!query.trim()) return [];
    return artisans
      .map((item) => ({ item, score: getMatchScore(query, item.searchTerms) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [artisans, query]);

  const countryResults = useMemo<Ranked<PublicCatalogCountry>[]>(() => {
    if (!query.trim()) return [];
    return countries
      .map((item) => ({ item, score: getMatchScore(query, item.searchTerms) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [countries, query]);

  const craftResults = useMemo<Ranked<PublicCatalogCraft>[]>(() => {
    if (!query.trim()) return [];
    return crafts
      .map((item) => ({ item, score: getMatchScore(query, item.searchTerms) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [crafts, query]);

  const totalResults =
    productResults.length + artisanResults.length + countryResults.length + craftResults.length;
  const hasQuery = query.trim().length > 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center text-[var(--text-secondary)]">
          جاري تحميل البحث...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      <section className="border-b border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[var(--container-max)] px-5 py-12 md:px-6 md:py-20">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
            Search IRTH
          </p>
          <h1 className="mt-3 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-6xl">
            Discover craft, people, and place.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            Search the live public marketplace across products, artisans, countries, and crafts.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[var(--container-max)] px-5 py-8 md:px-6 md:py-10">
        {error && (
          <div className="mb-6 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-6">
          <label htmlFor="global-search" className="text-sm font-medium text-[var(--color-espresso)]">
            What are you looking for?
          </label>
          <div className="mt-2 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 focus-within:border-[var(--color-copper)]">
            <span aria-hidden="true" className="text-[var(--text-muted)]">🔎</span>
            <input
              id="global-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try pottery, Egypt, Ahmed Hassan..."
              className="w-full bg-transparent py-4 text-base outline-none"
              autoFocus
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-sm text-[var(--text-muted)]">
                Clear
              </button>
            )}
          </div>
        </div>

        {!hasQuery ? (
          <div className="mt-12 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center text-[var(--text-secondary)]">
            Start exploring IRTH.
          </div>
        ) : totalResults === 0 ? (
          <div className="mt-12 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">No results found</p>
            <Link href="/crafts" className="mt-5 inline-block text-sm font-medium text-[var(--color-copper)] hover:underline">
              Explore crafts →
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-10 flex items-end justify-between gap-4">
              <h2 className="font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-4xl">
                Results for “{query.trim()}”
              </h2>
              <p className="text-sm text-[var(--text-muted)]">{totalResults} results</p>
            </div>

            {productResults.length > 0 && (
              <section className="mt-12">
                <h3 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Products</h3>
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {productResults.map(({ item }) => (
                    <ProductCard key={item.slug} product={item} />
                  ))}
                </div>
              </section>
            )}

            {artisanResults.length > 0 && (
              <section className="mt-14 border-t border-[var(--border-soft)] pt-12">
                <h3 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Artisans</h3>
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {artisanResults.map(({ item }) => (
                    <Link key={item.slug} href={`/artisan/${item.slug}`} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 hover:shadow-[var(--shadow-elevated)]">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{item.country} · {item.region}</p>
                      <h4 className="mt-2 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">{item.name}</h4>
                      <p className="mt-1 text-sm font-medium text-[var(--color-copper)]">{item.mainCraft}</p>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">{item.bio}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {countryResults.length > 0 && (
              <section className="mt-14 border-t border-[var(--border-soft)] pt-12">
                <h3 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Countries</h3>
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {countryResults.map(({ item }) => (
                    <Link key={item.slug} href={`/country/${item.slug}`} className="rounded-[var(--radius-lg)] bg-[var(--color-espresso)] p-7 text-[var(--color-ivory)]">
                      <p className="font-[var(--font-display)] text-3xl">{item.name}</p>
                      <p className="mt-1 text-sm opacity-65">{item.nameEn}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {craftResults.length > 0 && (
              <section className="mt-14 border-t border-[var(--border-soft)] pt-12">
                <h3 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Crafts</h3>
                <div className="mt-6 flex flex-wrap gap-3">
                  {craftResults.map(({ item }) => (
                    <Link
                      key={item.id}
                      href={`/crafts?category=${encodeURIComponent(item.nameEn)}`}
                      className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-3 text-sm text-[var(--color-espresso)] hover:border-[var(--color-copper)]"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}

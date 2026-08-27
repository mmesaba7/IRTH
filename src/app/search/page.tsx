"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Header from "../components/Header";
import ProductCard from "../components/ProductCard";

import {
  products as baseProducts,
  type Product,
} from "../data/products";

import {
  artisans as baseArtisans,
  type PublicArtisan,
} from "../data/artisans";

import {
  publicCountries,
  type PublicCountry,
} from "../data/countries";

type PrototypeArtisanRecord = {
  name: string;
  status?: string;
};

type PrototypeMarketRecord = {
  slug?: string;
  countrySlug?: string;
  status?: "active" | "inactive";
};

type RankedProduct = {
  item: Product;
  score: number;
};

type RankedArtisan = {
  item: PublicArtisan;
  score: number;
};

type RankedCountry = {
  item: PublicCountry;
  score: number;
};

type RankedCraft = {
  item: string;
  score: number;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getMatchScore(
  query: string,
  values: Array<string | undefined>
) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return 0;
  }

  let bestScore = 0;

  for (const value of values) {
    if (!value) {
      continue;
    }

    const normalizedValue = normalize(value);

    if (normalizedValue === normalizedQuery) {
      bestScore = Math.max(bestScore, 100);
      continue;
    }

    if (normalizedValue.startsWith(normalizedQuery)) {
      bestScore = Math.max(bestScore, 70);
      continue;
    }

    if (normalizedValue.includes(normalizedQuery)) {
      bestScore = Math.max(bestScore, 40);
    }
  }

  return bestScore;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [artisans, setArtisans] = useState<PublicArtisan[]>([]);
  const [countries, setCountries] = useState<PublicCountry[]>([]);

  useEffect(() => {
    // Products
    const storedProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );

    const allProducts: Product[] = [
      ...Object.values(baseProducts),
      ...storedProducts,
    ];

    const uniqueProducts = allProducts.filter(
      (product, index, self) =>
        product.slug &&
        index ===
          self.findIndex(
            (candidate) => candidate.slug === product.slug
          )
    );

    const visibleProducts = uniqueProducts.filter(
      (product) =>
        product.status === "approved" || !product.status
    );

    setProducts(visibleProducts);

    // Artisans
    const storedArtisans: PrototypeArtisanRecord[] = JSON.parse(
      localStorage.getItem("irth-artisans") || "[]"
    );

    const visibleArtisans = Object.values(baseArtisans).filter(
      (artisan) => {
        const operationalRecord = storedArtisans.find(
          (storedArtisan) =>
            storedArtisan.name.toLowerCase() ===
            artisan.name.toLowerCase()
        );

        return operationalRecord?.status !== "Deactivated";
      }
    );

    setArtisans(visibleArtisans);

    // Countries
    const storedMarkets: PrototypeMarketRecord[] = JSON.parse(
      localStorage.getItem("irth-countries") || "[]"
    );

    const visibleCountries = Object.values(publicCountries).filter(
      (country) => {
        const marketRecord = storedMarkets.find(
          (market) =>
            market.slug === country.slug ||
            market.countrySlug === country.slug
        );

        return marketRecord?.status !== "inactive";
      }
    );

    setCountries(visibleCountries);
  }, []);

  const crafts = useMemo(() => {
    const productCrafts = products.map(
      (product) => product.category
    );

    const artisanCrafts = artisans.flatMap((artisan) => [
      artisan.mainCraft,
      ...artisan.additionalCrafts,
    ]);

    const countryCrafts = countries.flatMap(
      (country) => country.crafts
    );

    return Array.from(
      new Set(
        [
          ...productCrafts,
          ...artisanCrafts,
          ...countryCrafts,
        ].filter(Boolean)
      )
    );
  }, [products, artisans, countries]);

  const productResults = useMemo<RankedProduct[]>(() => {
    if (!query.trim()) {
      return [];
    }

    return products
      .map((product) => ({
        item: product,
        score: getMatchScore(query, [
          product.name,
          product.artisan,
          product.country,
          product.category,
          product.material,
          product.description,
          product.story,
          product.origin,
          product.objectLabel,
        ]),
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [products, query]);

  const artisanResults = useMemo<RankedArtisan[]>(() => {
    if (!query.trim()) {
      return [];
    }

    return artisans
      .map((artisan) => ({
        item: artisan,
        score: getMatchScore(query, [
          artisan.name,
          artisan.mainCraft,
          ...artisan.additionalCrafts,
          artisan.country,
          artisan.region,
          artisan.bio,
          artisan.story,
        ]),
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [artisans, query]);

  const countryResults = useMemo<RankedCountry[]>(() => {
    if (!query.trim()) {
      return [];
    }

    return countries
      .map((country) => ({
        item: country,
        score: getMatchScore(query, [
          country.name,
          country.nameEn,
          country.culturalDescription,
          ...country.crafts,
        ]),
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [countries, query]);

  const craftResults = useMemo<RankedCraft[]>(() => {
    if (!query.trim()) {
      return [];
    }

    return crafts
      .map((craft) => ({
        item: craft,
        score: getMatchScore(query, [craft]),
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [crafts, query]);

  const totalResults =
    productResults.length +
    artisanResults.length +
    countryResults.length +
    craftResults.length;

  const hasQuery = query.trim().length > 0;

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      {/* Hero */}
      <section className="border-b border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[var(--container-max)] px-5 py-12 md:px-6 md:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Search IRTH
            </p>

            <h1 className="mt-3 font-[var(--font-display)] text-4xl font-normal leading-tight text-[var(--color-espresso)] md:text-6xl">
              Discover craft, people, and place.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)] md:text-lg">
              Search across handmade products, artisans, countries,
              and traditional crafts.
            </p>
          </div>
        </div>
      </section>

      {/* Search input */}
      <section className="mx-auto max-w-[var(--container-max)] px-5 py-8 md:px-6 md:py-10">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-6">
          <label
            htmlFor="global-search"
            className="text-sm font-medium text-[var(--color-espresso)]"
          >
            What are you looking for?
          </label>

          <div className="mt-2 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 transition-colors focus-within:border-[var(--color-copper)]">
            <span
              aria-hidden="true"
              className="text-[var(--text-muted)]"
            >
              🔎
            </span>

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
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--color-espresso)]"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
              Products
            </span>

            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
              Artisans
            </span>

            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
              Countries
            </span>

            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
              Crafts
            </span>
          </div>
        </div>

        {!hasQuery ? (
          <div className="mt-12 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
              Start exploring IRTH.
            </p>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Search by product name, artisan, country, material,
              region, or craft.
            </p>
          </div>
        ) : totalResults === 0 ? (
          <div className="mt-12 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
              No results found
            </p>

            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Try a different word or explore all crafts.
            </p>

            <Link
              href="/crafts"
              className="mt-5 inline-block text-sm font-medium text-[var(--color-copper)] hover:underline"
            >
              Explore crafts →
            </Link>
          </div>
        ) : (
          <>
            {/* Result summary */}
            <div className="mt-10 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
                  Results
                </p>

                <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-4xl">
                  Results for “{query.trim()}”
                </h2>
              </div>

              <p className="shrink-0 text-sm text-[var(--text-muted)]">
                {totalResults} results
              </p>
            </div>

            {/* Products */}
            {productResults.length > 0 && (
              <section className="mt-12">
                <div className="flex items-center justify-between">
                  <h3 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                    Products
                  </h3>

                  <span className="text-sm text-[var(--text-muted)]">
                    {productResults.length}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {productResults.map(({ item }) => (
                    <ProductCard
                      key={item.slug}
                      product={item}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Artisans */}
            {artisanResults.length > 0 && (
              <section className="mt-14 border-t border-[var(--border-soft)] pt-12">
                <div className="flex items-center justify-between">
                  <h3 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                    Artisans
                  </h3>

                  <Link
                    href="/artisans"
                    className="text-sm text-[var(--color-copper)] hover:underline"
                  >
                    View all →
                  </Link>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {artisanResults.map(({ item }) => (
                    <Link
                      key={item.slug}
                      href={`/artisan/${item.slug}`}
                      className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]"
                    >
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        {item.country} · {item.region}
                      </p>

                      <h4 className="mt-2 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                        {item.name}
                      </h4>

                      <p className="mt-1 text-sm font-medium text-[var(--color-copper)]">
                        {item.mainCraft}
                      </p>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">
                        {item.bio}
                      </p>

                      <p className="mt-4 text-sm text-[var(--text-muted)]">
                        ★ {item.rating.toFixed(1)} · {item.reviewCount} reviews
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Countries */}
            {countryResults.length > 0 && (
              <section className="mt-14 border-t border-[var(--border-soft)] pt-12">
                <div className="flex items-center justify-between">
                  <h3 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                    Countries
                  </h3>

                  <Link
                    href="/countries"
                    className="text-sm text-[var(--color-copper)] hover:underline"
                  >
                    View all →
                  </Link>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {countryResults.map(({ item }) => (
                    <Link
                      key={item.slug}
                      href={`/country/${item.slug}`}
                      className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-espresso)] p-7 text-[var(--color-ivory)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]"
                    >
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute right-5 top-5 h-20 w-20 rounded-full border border-[var(--color-copper)]" />

                        <div className="absolute bottom-6 left-6 h-12 w-12 rotate-45 border border-[var(--color-copper)]" />
                      </div>

                      <div className="relative z-10">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-copper)]">
                          Country
                        </p>

                        <h4 className="mt-3 font-[var(--font-display)] text-3xl">
                          {item.name}
                        </h4>

                        <p className="mt-1 text-sm text-[var(--color-ivory)]/60">
                          {item.nameEn}
                        </p>

                        <p className="mt-6 text-sm font-medium text-[var(--color-copper)]">
                          Explore country →
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Crafts */}
            {craftResults.length > 0 && (
              <section className="mt-14 border-t border-[var(--border-soft)] pt-12">
                <div className="flex items-center justify-between">
                  <h3 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
                    Crafts
                  </h3>

                  <Link
                    href="/crafts"
                    className="text-sm text-[var(--color-copper)] hover:underline"
                  >
                    View all →
                  </Link>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {craftResults.map(({ item }) => (
                    <Link
                      key={item}
                      href={`/crafts?category=${encodeURIComponent(item)}`}
                      className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--color-espresso)] transition-colors hover:border-[var(--color-copper)] hover:text-[var(--color-copper)]"
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </section>

      {/* Mobile navigation */}
      <nav className="bottom-nav md:hidden">
        <Link href="/">
          <span>🏠</span>
          Home
        </Link>

        <Link href="/search" className="active">
          <span>🔎</span>
          Search
        </Link>

        <Link href="/crafts">
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
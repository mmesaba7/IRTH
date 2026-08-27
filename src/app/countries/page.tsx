"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Header from "../components/Header";

import {
  publicCountries,
  type PublicCountry,
} from "../data/countries";

type PrototypeMarketRecord = {
  slug?: string;
  countrySlug?: string;
  status?: "active" | "inactive";
};

export default function CountriesPage() {
  const [countries, setCountries] = useState<PublicCountry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const publicCountryList = Object.values(publicCountries);

    const storedMarkets: PrototypeMarketRecord[] = JSON.parse(
      localStorage.getItem("irth-countries") || "[]"
    );

    const visibleCountries = publicCountryList.filter((country) => {
      const marketRecord = storedMarkets.find(
        (market) =>
          market.countrySlug === country.slug ||
          market.slug === country.slug
      );

      return marketRecord?.status !== "inactive";
    });

    setCountries(visibleCountries);
  }, []);

  const filteredCountries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return countries;
    }

    return countries.filter((country) => {
      const matchesIdentity =
        country.name.toLowerCase().includes(normalizedSearch) ||
        country.nameEn.toLowerCase().includes(normalizedSearch);

      const matchesCraft =
        country.crafts.some((craft) =>
          craft.toLowerCase().includes(normalizedSearch)
        );

      return matchesIdentity || matchesCraft;
    });
  }, [countries, searchTerm]);

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--color-espresso)] text-[var(--color-ivory)]">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-espresso)] via-[var(--color-espresso)] to-[var(--color-copper)]" />

          <div className="absolute left-8 top-10 h-28 w-28 rounded-full border border-[var(--color-copper)]/20" />

          <div className="absolute bottom-10 right-10 h-20 w-20 rotate-45 border border-[var(--color-copper)]/20" />
        </div>

        <div className="relative z-10 mx-auto max-w-[var(--container-max)] px-5 py-16 md:px-6 md:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-copper)]">
              Explore by place
            </p>

            <h1 className="mt-4 font-[var(--font-display)] text-5xl font-normal leading-[1.05] md:text-7xl">
              Discover heritage through place.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-ivory)]/70 md:text-lg">
              Explore countries through their crafts, artisans, materials, and
              cultural stories.
            </p>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="mx-auto max-w-[var(--container-max)] px-5 py-8 md:px-6 md:py-10">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-6">
          <label
            htmlFor="country-search"
            className="text-sm font-medium text-[var(--color-espresso)]"
          >
            Search countries
          </label>

          <input
            id="country-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by country or craft..."
            className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-copper)]"
          />
        </div>

        {/* Results header */}
        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Countries
            </p>

            <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">
              Explore cultural landscapes.
            </h2>
          </div>

          <p className="shrink-0 text-sm text-[var(--text-muted)]">
            {filteredCountries.length} countries
          </p>
        </div>

        {/* Countries */}
        {filteredCountries.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              No countries found
            </p>

            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Try changing your search.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCountries.map((country) => (
              <article
                key={country.slug}
                className="group overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]"
              >
                {/* Visual */}
                <Link
                  href={`/country/${country.slug}`}
                  className="block"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-espresso)]">
                    {country.heroImage ? (
                      <img
                        src={country.heroImage}
                        alt={country.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-espresso)] to-[var(--color-copper)] opacity-90" />

                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute left-8 top-8 h-20 w-20 rounded-full border border-[var(--color-ivory)]/50" />

                          <div className="absolute bottom-8 right-8 h-16 w-16 rotate-45 border border-[var(--color-ivory)]/30" />

                          <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-ivory)]/20" />
                        </div>
                      </>
                    )}

                    <div className="absolute inset-0 flex items-end">
                      <div className="w-full bg-gradient-to-t from-black/55 to-transparent p-6 pt-16">
                        <p className="font-[var(--font-display)] text-3xl text-[var(--color-ivory)]">
                          {country.name}
                        </p>

                        <p className="mt-1 text-sm text-[var(--color-ivory)]/65">
                          {country.nameEn}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Content */}
                <div className="p-6">
                  {country.culturalDescription && (
                    <p className="line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">
                      {country.culturalDescription}
                    </p>
                  )}

                  {country.crafts.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {country.crafts.slice(0, 3).map((craft) => (
                        <span
                          key={craft}
                          className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
                        >
                          {craft}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 border-t border-[var(--border-soft)] pt-4">
                    <Link
                      href={`/country/${country.slug}`}
                      className="text-sm font-medium text-[var(--color-copper)] transition-colors hover:text-[var(--color-espresso)]"
                    >
                      Explore {country.nameEn} →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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
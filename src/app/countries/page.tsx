"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import {
  loadPublicMarketplaceCatalog,
  type PublicCatalogCountry,
} from "@/lib/publicMarketplace";

export default function CountriesPage() {
  const [countries, setCountries] = useState<PublicCatalogCountry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const catalog = await loadPublicMarketplaceCatalog();
        if (!cancelled) setCountries(catalog.countries);
      } catch (loadError) {
        console.error("Could not load public countries:", loadError);
        if (!cancelled) setError("تعذر تحميل الدول حاليًا.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCountries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return countries;

    return countries.filter((country) =>
      country.searchTerms.some((value) =>
        value.toLowerCase().includes(normalizedSearch)
      )
    );
  }, [countries, searchTerm]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center text-[var(--text-secondary)]">
          جاري تحميل الدول...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      <section className="relative overflow-hidden bg-[var(--color-espresso)] text-[var(--color-ivory)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-espresso)] to-[var(--color-copper)] opacity-20" />
        <div className="relative z-10 mx-auto max-w-[var(--container-max)] px-5 py-16 md:px-6 md:py-24">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-copper)]">
            Explore by place
          </p>
          <h1 className="mt-4 max-w-3xl font-[var(--font-display)] text-5xl font-normal leading-[1.05] md:text-7xl">
            Discover heritage through place.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-ivory)]/70 md:text-lg">
            Explore active IRTH countries through their crafts and artisans.
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
          <label htmlFor="country-search" className="text-sm font-medium text-[var(--color-espresso)]">
            Search countries
          </label>
          <input
            id="country-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by country or craft..."
            className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
          />
        </div>

        <div className="mt-10 flex items-end justify-between gap-4">
          <h2 className="font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">
            Explore cultural landscapes.
          </h2>
          <p className="text-sm text-[var(--text-muted)]">{filteredCountries.length} countries</p>
        </div>

        {filteredCountries.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center text-[var(--text-secondary)]">
            No countries found
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCountries.map((country) => (
              <article
                key={country.slug}
                className="group overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]"
              >
                <Link href={`/country/${country.slug}`} className="block">
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-espresso)]">
                    {country.heroImage ? (
                      <img
                        src={country.heroImage}
                        alt={country.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-espresso)] to-[var(--color-copper)]" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-6 pt-16 text-[var(--color-ivory)]">
                      <p className="font-[var(--font-display)] text-3xl">{country.name}</p>
                      <p className="mt-1 text-sm opacity-70">{country.nameEn}</p>
                    </div>
                  </div>
                </Link>

                <div className="p-6">
                  {country.culturalDescription && (
                    <p className="line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">
                      {country.culturalDescription}
                    </p>
                  )}

                  {country.crafts.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {country.crafts.slice(0, 3).map((craft) => (
                        <span key={craft} className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
                          {craft}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 border-t border-[var(--border-soft)] pt-4">
                    <Link href={`/country/${country.slug}`} className="text-sm font-medium text-[var(--color-copper)] hover:text-[var(--color-espresso)]">
                      Explore {country.nameEn} →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import {
  artisans as baseArtisans,
  type PublicArtisan,
} from "../data/artisans";

type PrototypeArtisanStatus = {
  name: string;
  status?: string;
};

export default function ArtisansPage() {
  const [artisans, setArtisans] = useState<PublicArtisan[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCraft, setSelectedCraft] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");

  useEffect(() => {
    const publicArtisans = Object.values(baseArtisans);

    const storedArtisans: PrototypeArtisanStatus[] = JSON.parse(
      localStorage.getItem("irth-artisans") || "[]"
    );

    const activeArtisans = publicArtisans.filter((artisan) => {
      const operationalRecord = storedArtisans.find(
        (storedArtisan) =>
          storedArtisan.name.toLowerCase() === artisan.name.toLowerCase()
      );

      return operationalRecord?.status !== "Deactivated";
    });

    setArtisans(activeArtisans);
  }, []);

  const crafts = useMemo(
    () => [
      "all",
      ...Array.from(new Set(artisans.map((artisan) => artisan.mainCraft))),
    ],
    [artisans]
  );

  const countries = useMemo(
    () => [
      "all",
      ...Array.from(new Set(artisans.map((artisan) => artisan.country))),
    ],
    [artisans]
  );

  const filteredArtisans = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return artisans.filter((artisan) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        artisan.name.toLowerCase().includes(normalizedSearch) ||
        artisan.mainCraft.toLowerCase().includes(normalizedSearch) ||
        artisan.country.toLowerCase().includes(normalizedSearch) ||
        artisan.region.toLowerCase().includes(normalizedSearch);

      const matchesCraft =
        selectedCraft === "all" || artisan.mainCraft === selectedCraft;

      const matchesCountry =
        selectedCountry === "all" || artisan.country === selectedCountry;

      return matchesSearch && matchesCraft && matchesCountry;
    });
  }, [artisans, searchTerm, selectedCraft, selectedCountry]);

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      {/* Page introduction */}
      <section className="border-b border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[var(--container-max)] px-5 py-12 md:px-6 md:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Meet the makers
            </p>

            <h1 className="mt-3 font-[var(--font-display)] text-4xl font-normal leading-tight text-[var(--color-espresso)] md:text-6xl">
              The hands behind the heritage.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)] md:text-lg">
              Discover artisans preserving traditional crafts, materials, and
              stories through handmade work shaped by place and generations.
            </p>
          </div>
        </div>
      </section>

      {/* Search and filters */}
      <section className="mx-auto max-w-[var(--container-max)] px-5 py-8 md:px-6 md:py-10">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-6">
          <div>
            <label
              htmlFor="artisan-search"
              className="text-sm font-medium text-[var(--color-espresso)]"
            >
              Search artisans
            </label>

            <input
              id="artisan-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by artisan, craft, country, or region..."
              className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-copper)]"
            />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="artisan-craft-filter"
                className="text-sm font-medium text-[var(--color-espresso)]"
              >
                Craft
              </label>

              <select
                id="artisan-craft-filter"
                value={selectedCraft}
                onChange={(event) => setSelectedCraft(event.target.value)}
                className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-copper)]"
              >
                {crafts.map((craft) => (
                  <option key={craft} value={craft}>
                    {craft === "all" ? "All crafts" : craft}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="artisan-country-filter"
                className="text-sm font-medium text-[var(--color-espresso)]"
              >
                Country
              </label>

              <select
                id="artisan-country-filter"
                value={selectedCountry}
                onChange={(event) => setSelectedCountry(event.target.value)}
                className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-copper)]"
              >
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country === "all" ? "All countries" : country}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results header */}
        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--color-copper)]">
              Artisans
            </p>

            <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-4xl">
              Explore their stories.
            </h2>
          </div>

          <p className="shrink-0 text-sm text-[var(--text-muted)]">
            {filteredArtisans.length} artisans
          </p>
        </div>

        {/* Artisan cards */}
        {filteredArtisans.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              No artisans found
            </p>

            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArtisans.map((artisan) => (
              <article
                key={artisan.slug}
                className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]"
              >
                {/* Visual */}
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
                        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[var(--color-ivory)]/90 text-center shadow-lg">
                          <span className="px-4 text-sm font-medium text-[var(--color-espresso)]">
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

                {/* Content */}
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
        )}
      </section>

      {/* Mobile navigation */}
      <nav className="bottom-nav md:hidden">
        <Link href="/">
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
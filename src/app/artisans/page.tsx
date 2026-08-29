"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import {
  loadPublicMarketplaceCatalog,
  type PublicCatalogArtisan,
} from "@/lib/publicMarketplace";

export default function ArtisansPage() {
  const [artisans, setArtisans] = useState<PublicCatalogArtisan[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCraft, setSelectedCraft] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const catalog = await loadPublicMarketplaceCatalog();
        if (!cancelled) setArtisans(catalog.artisans);
      } catch (loadError) {
        console.error("Could not load public artisans:", loadError);
        if (!cancelled) setError("تعذر تحميل الحرفيين حاليًا.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
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
        !normalizedSearch ||
        artisan.searchTerms.some((value) =>
          value.toLowerCase().includes(normalizedSearch)
        );
      const matchesCraft =
        selectedCraft === "all" || artisan.mainCraft === selectedCraft;
      const matchesCountry =
        selectedCountry === "all" || artisan.country === selectedCountry;

      return matchesSearch && matchesCraft && matchesCountry;
    });
  }, [artisans, searchTerm, selectedCraft, selectedCountry]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center text-[var(--text-secondary)]">
          جاري تحميل الحرفيين...
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
            Meet the makers
          </p>
          <h1 className="mt-3 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-6xl">
            The hands behind the heritage.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            Discover active IRTH artisans and the craft traditions they preserve.
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
          <label htmlFor="artisan-search" className="text-sm font-medium text-[var(--color-espresso)]">
            Search artisans
          </label>
          <input
            id="artisan-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by artisan, craft, country, or region..."
            className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
          />

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <select
              value={selectedCraft}
              onChange={(event) => setSelectedCraft(event.target.value)}
              className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm"
            >
              {crafts.map((craft) => (
                <option key={craft} value={craft}>
                  {craft === "all" ? "All crafts" : craft}
                </option>
              ))}
            </select>

            <select
              value={selectedCountry}
              onChange={(event) => setSelectedCountry(event.target.value)}
              className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm"
            >
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country === "all" ? "All countries" : country}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-10 flex items-end justify-between gap-4">
          <h2 className="font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-4xl">
            Explore their stories.
          </h2>
          <p className="text-sm text-[var(--text-muted)]">{filteredArtisans.length} artisans</p>
        </div>

        {filteredArtisans.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center text-[var(--text-secondary)]">
            No artisans found
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArtisans.map((artisan) => (
              <article
                key={artisan.slug}
                className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-olive)]">
                  {artisan.profileImage ? (
                    <img src={artisan.profileImage} alt={artisan.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-center text-[var(--color-ivory)]">
                      <span className="font-[var(--font-display)] text-2xl">{artisan.name}</span>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 rounded-full bg-[var(--surface)]/90 px-3 py-1.5 text-xs font-medium text-[var(--color-espresso)]">
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
                  <div className="mt-5 border-t border-[var(--border-soft)] pt-4 text-right">
                    <Link href={`/artisan/${artisan.slug}`} className="text-sm font-medium text-[var(--color-copper)] hover:text-[var(--color-espresso)]">
                      View artisan →
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

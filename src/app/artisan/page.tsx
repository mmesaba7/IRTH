"use client";

import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import { products } from "../data/products";

export default function ArtisanPage() {
  const artisan = {
    name: "Ahmed Hassan",
    country: "Egypt",
    region: "Upper Egypt",
    craft: "Pottery artisan",
    otherCrafts: ["Clay work", "Traditional pottery"],
    rating: 4.9,
    reviews: 24,
    bio: "A pottery artisan dedicated to preserving traditional handmade techniques and the cultural identity of Upper Egypt.",
    story:
      "Ahmed learned pottery through generations of craft knowledge passed down within his community. His work combines traditional techniques with a contemporary understanding of form, creating pieces that remain rooted in their place and story.",
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      {/* Hero */}
      <section className="border-b border-[var(--border-soft)]">
        <div className="mx-auto max-w-[var(--container-max)] px-6 py-12 md:py-20">
          <a
            href="/"
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--color-copper)]"
          >
            ← Back to crafts
          </a>

          <div className="mt-10 grid gap-12 lg:grid-cols-[320px_1fr] lg:items-center">
            {/* Artisan image */}
            <div className="relative aspect-square overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-olive)]">
              <div className="absolute inset-6 rounded-[var(--radius-xl)] border border-[var(--color-antique-gold)]/40" />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-36 w-36 items-center justify-center rounded-full bg-[var(--color-ivory)]">
                  <span className="font-[var(--font-display)] text-5xl text-[var(--color-espresso)]">
                    AH
                  </span>
                </div>
              </div>

              <div className="absolute bottom-5 left-5 rounded-[var(--radius-md)] bg-[var(--color-espresso)]/90 px-4 py-3 text-[var(--color-ivory)] backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.16em] opacity-70">
                  Artisan
                </p>

                <p className="mt-1 font-[var(--font-display)]">
                  {artisan.craft}
                </p>
              </div>
            </div>

            {/* Artisan information */}
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
                Artisan profile
              </p>

              <h1 className="mt-4 font-[var(--font-display)] text-5xl font-normal leading-tight text-[var(--color-espresso)] md:text-7xl">
                {artisan.name}
              </h1>

              <p className="mt-4 text-base text-[var(--text-secondary)]">
                {artisan.region} · {artisan.country}
              </p>

              <p className="mt-7 text-lg leading-8 text-[var(--text-secondary)]">
                {artisan.bio}
              </p>

              {/* Rating */}
              <div className="mt-7 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg text-[var(--color-antique-gold)]">
                    ★
                  </span>

                  <span className="font-medium text-[var(--color-espresso)]">
                    {artisan.rating}
                  </span>
                </div>

                <span className="text-sm text-[var(--text-muted)]">
                  {artisan.reviews} reviews
                </span>
              </div>

              {/* Craft tags */}
              <div className="mt-7 flex flex-wrap gap-3">
                <span className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-sm text-[var(--color-espresso)]">
                  {artisan.craft}
                </span>

                {artisan.otherCrafts.map((craft) => (
                  <span
                    key={craft}
                    className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-sm text-[var(--color-espresso)]"
                  >
                    {craft}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="border-b border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
          <div className="grid gap-12 md:grid-cols-2 md:gap-20">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-olive)]">
                The story
              </p>

              <h2 className="mt-4 font-[var(--font-display)] text-4xl font-normal leading-tight text-[var(--color-espresso)] md:text-5xl">
                Craft passed from one generation to the next.
              </h2>
            </div>

            <div>
              <p className="text-lg leading-8 text-[var(--text-secondary)]">
                {artisan.story}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Video */}
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
        <div className="grid overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-espresso)] md:grid-cols-[1.1fr_0.9fr]">
          <div className="flex min-h-[360px] items-center justify-center bg-[var(--color-olive)] md:min-h-[460px]">
            <div className="text-center text-[var(--color-ivory)]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[var(--color-antique-gold)]">
                <span className="ml-1 text-2xl">▶</span>
              </div>

              <p className="mt-5 text-sm uppercase tracking-[0.18em]">
                Artisan story
              </p>

              <p className="mt-2 text-sm opacity-70">
                Video · under 1 minute
              </p>
            </div>
          </div>

          <div className="flex items-center p-8 md:p-14">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-antique-gold)]">
                Meet the maker
              </p>

              <h2 className="mt-4 font-[var(--font-display)] text-4xl font-normal text-[var(--color-ivory)]">
                The hands behind the objects.
              </h2>

              <p className="mt-6 text-base leading-7 text-[var(--color-ivory)]/70">
                Discover the person, place, and tradition behind every piece
                without leaving IRTH.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="border-y border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Products
            </p>

            <h2 className="mt-3 font-[var(--font-display)] text-4xl font-normal text-[var(--color-espresso)] md:text-5xl">
              Made by {artisan.name}.
            </h2>

            <p className="mt-5 text-base leading-7 text-[var(--text-secondary)]">
              Explore the handmade pieces available from this artisan through
              IRTH.
            </p>
          </div>

          <div className="mt-12 max-w-md">
            <ProductCard product={products["clay-vessel"]} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--color-espresso)] text-[var(--color-ivory)]">
        <div className="mx-auto max-w-[var(--container-max)] px-6 py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-[var(--font-display)] text-2xl tracking-[0.08em]">
              IRTH
            </p>

            <p className="text-sm text-[var(--color-ivory)]/60">
              Heritage · Craft · Human
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
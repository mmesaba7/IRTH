"use client";

import Link from "next/link";
import Header from "../components/Header";
import IrthIcon from "../components/IrthIcon";

const explorePaths = [
  {
    title: "Explore by country",
    description:
      "Discover places through their crafts, artisans, materials, and cultural stories.",
    href: "/countries",
    label: "Countries",
    eyebrow: "Place",
  },
  {
    title: "Explore by craft",
    description:
      "Browse handmade work through pottery, textiles, metalwork, woodwork, and other craft traditions.",
    href: "/crafts",
    label: "Crafts",
    eyebrow: "Craft",
  },
  {
    title: "Meet the artisans",
    description:
      "Discover the people preserving traditional knowledge through handmade work.",
    href: "/artisans",
    label: "Artisans",
    eyebrow: "People",
  },
  {
    title: "Discover their stories",
    description:
      "Explore cultural stories, makers, materials, and the heritage behind the objects.",
    href: "/stories",
    label: "Stories",
    eyebrow: "Stories",
  },
];

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--color-espresso)] text-[var(--color-ivory)]">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-espresso)] via-[var(--color-espresso)] to-[var(--color-copper)]" />

          <div className="absolute left-8 top-10 h-28 w-28 rounded-full border border-[var(--color-copper)]/20" />

          <div className="absolute bottom-10 right-12 h-20 w-20 rotate-45 border border-[var(--color-copper)]/20" />

          <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-copper)]/10" />
        </div>

        <div className="relative z-10 mx-auto max-w-[var(--container-max)] px-5 py-16 md:px-6 md:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-copper)]">
              Explore IRTH
            </p>

            <h1 className="mt-4 font-[var(--font-display)] text-5xl font-normal leading-[1.05] md:text-7xl">
              Start with what draws you in.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-ivory)]/70 md:text-lg">
              Discover heritage through place, craft, people, and story.
            </p>
          </div>
        </div>
      </section>

      {/* Explore paths */}
      <section className="mx-auto max-w-[var(--container-max)] px-5 py-12 md:px-6 md:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
            Ways to explore
          </p>

          <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">
            Find your way into IRTH.
          </h2>

          <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
            There is no single path through heritage. Begin with a place, a
            craft, a maker, or a story.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {explorePaths.map((path, index) => (
            <Link
              key={path.href}
              href={path.href}
              className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)] md:p-8"
            >
              <div className="absolute right-5 top-5 font-[var(--font-display)] text-6xl text-[var(--color-copper)]/10">
                0{index + 1}
              </div>

              <div className="relative z-10">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-copper)]">
                  {path.eyebrow}
                </p>

                <h3 className="mt-4 font-[var(--font-display)] text-3xl text-[var(--color-espresso)]">
                  {path.title}
                </h3>

                <p className="mt-4 max-w-md text-sm leading-7 text-[var(--text-secondary)]">
                  {path.description}
                </p>

                <div className="mt-7 border-t border-[var(--border-soft)] pt-5">
                  <span className="text-sm font-medium text-[var(--color-copper)] transition-colors group-hover:text-[var(--color-espresso)]">
                    Explore {path.label} →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Cultural discovery note */}
      <section className="border-y border-[var(--border-soft)] bg-[var(--surface-muted)]">
        <div className="mx-auto max-w-[var(--container-max)] px-5 py-12 md:px-6 md:py-16">
          <div className="max-w-3xl">
            <p className="font-[var(--font-display)] text-3xl leading-tight text-[var(--color-espresso)] md:text-4xl">
              Heritage is more than an object.
            </p>

            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              IRTH connects handmade work with the people, places, traditions,
              and stories behind it.
            </p>
          </div>
        </div>
      </section>

      {/* Mobile navigation */}
      <nav className="bottom-nav md:hidden">
        <Link href="/"><IrthIcon name="home" />Home</Link>
        <Link href="/search"><IrthIcon name="search" />Search</Link>
        <Link href="/explore" className="active"><IrthIcon name="compass" />Explore</Link>
        <Link href="/saved"><IrthIcon name="heart" />Saved</Link>
        <Link href="/account"><IrthIcon name="user" />Account</Link>
      </nav>
    </main>
  );
}
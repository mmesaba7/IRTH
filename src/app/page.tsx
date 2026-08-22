"use client";

import ProductCard from "./components/ProductCard";
import Button from "./components/Button";
import Header from "./components/Header";
import { products } from "./data/products";
import { getCustomProducts } from "./data/productStorage";

export default function ProductPage() {
  const slug = "clay-vessel";

  return (
  <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
    <Header />

    <section className="relative overflow-hidden border-b border-[var(--border-soft)]">
        <div className="mx-auto max-w-[var(--container-max)] grid min-h-[680px] items-center gap-14 px-6 py-20 md:grid-cols-[1.05fr_0.95fr] md:py-28">
          <div className="relative z-10 max-w-2xl">
            <p className="mb-6 text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-copper)]">
              Heritage · Craft · Human
            </p>

            <h1 className="font-[var(--font-display)] text-5xl font-normal leading-[1.02] tracking-[-0.025em] text-[var(--color-espresso)] md:text-7xl lg:text-8xl">
              Discover the hands behind the heritage.
            </h1>

            <p className="mt-8 max-w-xl text-lg leading-8 text-[var(--text-secondary)] md:text-xl">
              Explore authentic handmade crafts, meet the artisans behind them,
              and discover the cultures that keep heritage alive.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button
  onClick={() => {
    const cart = JSON.parse(
      localStorage.getItem("irth-cart") || "[]"
    );

    localStorage.setItem(
  "irth-cart",
  JSON.stringify([...cart, slug])
);

window.dispatchEvent(new Event("irth-cart-updated"));

window.location.href = "/cart";
  }}
>
  Add to cart
</Button>
<Button>Explore crafts</Button>
              <Button variant="secondary">Discover artisans</Button>
              <Button variant="ghost">Learn more</Button>
            </div>
          </div>

          <div className="relative min-h-[420px] md:min-h-[560px]">
            <div className="absolute inset-8 rounded-[var(--radius-xl)] bg-[var(--surface-muted)]" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-[330px] w-[260px] rotate-[-4deg] rounded-[45%_45%_38%_38%] bg-[var(--color-terracotta)] shadow-[var(--shadow-card)] md:h-[430px] md:w-[340px]">
                <div className="absolute left-1/2 top-[12%] h-[76%] w-[72%] -translate-x-1/2 rounded-[45%_45%_42%_42%] border border-[var(--color-antique-gold)]/60" />

                <div className="absolute bottom-[18%] left-1/2 h-px w-[58%] -translate-x-1/2 bg-[var(--color-antique-gold)]/70" />

                <div className="absolute bottom-[12%] left-1/2 h-3 w-[42%] -translate-x-1/2 rounded-full bg-[var(--color-bronze)]/70" />
              </div>
            </div>

            <div className="absolute bottom-8 left-4 max-w-[220px] rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)]/90 p-5 shadow-[var(--shadow-soft)] backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-olive)]">
                The object
              </p>

              <p className="mt-2 font-[var(--font-display)] text-lg text-[var(--color-espresso)]">
                Made by hand. Rooted in place.
              </p>
            </div>
          </div>
        </div>
      </section>

            <section className="border-y border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[var(--container-max)] px-6 py-20 md:py-24">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-olive)]">
                Featured
              </p>

              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-normal leading-tight text-[var(--color-espresso)] md:text-5xl">
                Stories you can take home.
              </h2>

              <p className="mt-5 max-w-xl text-base leading-7 text-[var(--text-secondary)] md:text-lg">
                Discover pieces connected to the people, places, and traditions
                that shaped them.
              </p>
            </div>

            <a
              href="#"
              className="shrink-0 text-sm font-medium text-[var(--color-copper)] transition-colors hover:text-[var(--color-espresso)]"
            >
              View all crafts →
            </a>
          </div>

                   <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(products).map((product) => (
              <ProductCard
  key={product.slug}
  slug={product.slug}
/>
            ))}
          </div>
        </div>
      </section>

            <section className="mx-auto  px-6 py-20 md:py-28">
        <div className="grid overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-olive)] md:grid-cols-[0.9fr_1.1fr]">
          <div className="relative min-h-[480px] md:min-h-[620px]">
            <div className="absolute inset-6 rounded-[var(--radius-lg)] border border-[var(--color-ivory)]/20" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-[320px] w-[240px] rotate-[4deg] rounded-[45%_45%_35%_35%] bg-[var(--color-terracotta)] shadow-[var(--shadow-card)] md:h-[420px] md:w-[310px]">
                <div className="absolute left-1/2 top-[12%] h-[76%] w-[72%] -translate-x-1/2 rounded-[45%] border border-[var(--color-antique-gold)]/60" />

                <div className="absolute bottom-[18%] left-1/2 h-px w-[58%] -translate-x-1/2 bg-[var(--color-antique-gold)]/70" />

                <div className="absolute bottom-[12%] left-1/2 h-3 w-[42%] -translate-x-1/2 rounded-full bg-[var(--color-bronze)]/70" />
              </div>
            </div>

            <div className="absolute bottom-8 left-8 rounded-[var(--radius-md)] bg-[var(--color-espresso)]/90 px-5 py-4 text-[var(--color-ivory)] backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.18em] opacity-70">
                Upper Egypt
              </p>

              <p className="mt-1 font-[var(--font-display)] text-lg">
                Handmade pottery
              </p>
            </div>
          </div>

          <div className="flex items-center p-8 md:p-14 lg:p-20">
            <div className="max-w-xl">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-antique-gold)]">
                Meet the maker
              </p>

              <h2 className="mt-4 font-[var(--font-display)] text-4xl font-normal leading-tight text-[var(--color-ivory)] md:text-5xl">
                Every piece has a person behind it.
              </h2>

              <p className="mt-7 text-lg leading-8 text-[var(--color-ivory)]/75">
                IRTH connects you with the artisans, places, materials, and
                stories behind handmade heritage.
              </p>

              <div className="mt-8">
                <Button variant="secondary">Meet the artisans</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

            <footer className="bg-[var(--color-espresso)] text-[var(--color-ivory)]">
        <div className="mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-20">
          <div className="grid gap-12 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div className="max-w-sm">
              <p className="font-[var(--font-display)] text-3xl tracking-[0.08em]">
                IRTH
              </p>

              <p className="mt-5 text-sm leading-7 text-[var(--color-ivory)]/65">
                A marketplace for heritage, craft, and the people who keep
                culture alive.
              </p>
            </div>

            <div>
               <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-antique-gold)]">
                Discover
              </p>

              <div className="mt-5 space-y-3 text-sm text-[var(--color-ivory)]/70">
                <a href="#" className="block transition hover:text-[var(--color-ivory)]">
                  Crafts
                </a>
                <a href="#" className="block transition hover:text-[var(--color-ivory)]">
                  Artisans
                </a>
                <a href="#" className="block transition hover:text-[var(--color-ivory)]">
                  Countries
                </a>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-antique-gold)]">
                IRTH
              </p>

              <div className="mt-5 space-y-3 text-sm text-[var(--color-ivory)]/70">
                <a href="#" className="block transition hover:text-[var(--color-ivory)]">
                  Our story
                </a>
                <a href="#" className="block transition hover:text-[var(--color-ivory)]">
                  Meet the team
                </a>
                <a href="#" className="block transition hover:text-[var(--color-ivory)]">
                  Journal
                </a>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-antique-gold)]">
                Connect
              </p>

              <div className="mt-5 space-y-3 text-sm text-[var(--color-ivory)]/70">
                <a href="#" className="block transition hover:text-[var(--color-ivory)]">
                  Instagram
                </a>
                <a href="#" className="block transition hover:text-[var(--color-ivory)]">
                  LinkedIn
                </a>
                <a href="#" className="block transition hover:text-[var(--color-ivory)]">
                  Contact
                </a>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col gap-4 border-t border-[var(--color-ivory)]/10 pt-6 text-xs text-[var(--color-ivory)]/45 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 IRTH. All rights reserved.</p>

            <p>Heritage · Craft · Human</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
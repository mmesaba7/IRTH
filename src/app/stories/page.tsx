"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import Link from "next/link";
import IrthIcon from "../components/IrthIcon";
import {
  loadPublicMarketplaceCatalog,
  type PublicCatalogArtisan,
} from "@/lib/publicMarketplace";

export default function StoriesPage() {
  const [artisans, setArtisans] = useState<PublicCatalogArtisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStories() {
      setLoading(true);
      setError("");
      try {
        const catalog = await loadPublicMarketplaceCatalog();
        if (cancelled) return;
        setArtisans(catalog.artisans.filter((artisan) => artisan.story.trim().length > 0));
      } catch (loadError) {
        console.error("Could not load artisan stories:", loadError);
        if (!cancelled) setError("تعذر تحميل قصص الحرفيين حاليًا.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadStories();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري تحميل القصص...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)] md:pb-0">
      <Header />

      <section className="relative overflow-hidden bg-[var(--color-petrol-deep)] text-[var(--color-ivory)]">
        <div className="irth-pattern absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-30" />
        <div className="mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
          <p className="section-eyebrow !text-[var(--color-antique-gold)]">Stories · قصص إرث</p>
          <h1 className="mt-4 max-w-3xl font-[var(--font-display)] text-5xl font-semibold leading-[1.05] text-[#fff7e7] md:text-7xl">
            الحرفة تبدأ بإنسان.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-ivory)]/70 md:text-lg">
            اكتشف القصص الإنسانية والثقافية وراء الحرف، وتعرّف على الحرفيين الذين يحملون المعرفة من جيل إلى جيل.
          </p>
        </div>
      </section>

      <section className="irth-section">
        {error && (
          <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {!error && artisans.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">لا توجد قصص منشورة حاليًا.</p>
            <Link href="/artisans" className="irth-section-link mt-4 justify-center">اكتشف الحرفيين <span aria-hidden="true">→</span></Link>
          </div>
        ) : (
          <div className="space-y-10 md:space-y-16">
            {artisans.map((artisan, index) => (
              <article
                key={artisan.id}
                className={`overflow-hidden border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-soft)] md:grid md:grid-cols-2 ${index % 2 === 0 ? "rounded-[var(--radius-xl)]" : "rounded-[var(--radius-md)]"}`}
              >
                <div className={`relative min-h-[310px] overflow-hidden bg-[var(--color-petrol)] ${index % 2 === 1 ? "md:order-2" : ""}`}>
                  {artisan.profileImage ? (
                    <img src={artisan.profileImage} alt={artisan.name} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="irth-pattern absolute inset-0 opacity-40" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-petrol-deep)]/65 via-transparent to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 text-white">
                    <div>
                      <p className="text-xs font-semibold text-[var(--color-antique-gold)]">{artisan.mainCraft}</p>
                      <p className="mt-1 text-sm text-white/75">{artisan.region || artisan.country}</p>
                    </div>
                    {artisan.video && (
                      <a href={artisan.video} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/25 bg-black/25 px-4 py-2 text-xs font-semibold backdrop-blur-md hover:bg-black/40">
                        Watch video
                      </a>
                    )}
                  </div>
                </div>

                <div className={`flex items-center p-7 md:p-10 lg:p-14 ${index % 2 === 1 ? "md:order-1" : ""}`}>
                  <div>
                    <p className="section-eyebrow">Artisan story</p>
                    <h2 className="mt-3 font-[var(--font-display)] text-4xl font-semibold leading-tight text-[var(--color-espresso)] md:text-5xl">{artisan.name}</h2>
                    <p className="mt-5 line-clamp-6 text-sm leading-8 text-[var(--text-secondary)] md:text-base">{artisan.story}</p>
                    <Link href={`/artisan/${artisan.slug}`} className="btn-secondary mt-7">اقرأ القصة كاملة <span aria-hidden="true">→</span></Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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

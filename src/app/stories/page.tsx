"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import Link from "next/link";

// تعريف شكل الحرفي
type Artisan = {
  id?: string;
  name: string;
  country: string;
  status: string;
  story?: string;
  video?: string;
  profileImage?: string;
  craft?: string;
  region?: string;
  createdAt: string;
};

export default function StoriesPage() {
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // جلب الحرفيين من localStorage
    const allArtisans: Artisan[] = JSON.parse(
      localStorage.getItem("irth-artisans") || "[]"
    );

    // فلترة الحرفيين النشطين والذين لديهم قصة
    const activeArtisans = allArtisans.filter(
      (a) =>
        (a.status === "Active" || a.status === "Pending Verification") &&
        a.story &&
        a.story.trim().length > 0
    );

    setArtisans(activeArtisans);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p className="text-[var(--text-secondary)]">جاري التحميل...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 md:py-24">
        {/* عنوان الصفحة */}
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-copper)]">
            Stories
          </p>
          <h1 className="mt-4 font-[var(--font-display)] text-5xl md:text-6xl leading-[1.05] text-[var(--color-espresso)]">
            قصص الحرفيين
          </h1>
          <p className="mt-6 text-lg text-[var(--text-secondary)] leading-relaxed">
            اكتشف القصص الإنسانية والثقافية وراء كل حرفة، وتعرف على الحرفيين
            الذين يحافظون على تراثنا.
          </p>
        </div>

        {/* قائمة القصص */}
        {artisans.length === 0 ? (
          <div className="mt-16 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-12 text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              🎉 مفيش قصص متاحة حالياً
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              الحرفيين سيضيفون قصصهم قريباً
            </p>
          </div>
        ) : (
          <div className="mt-16 space-y-16">
            {artisans.map((artisan) => (
              <article
                key={artisan.name}
                className="group border-b border-[var(--border-soft)] pb-16 last:border-0 last:pb-0"
              >
                <div className="grid gap-10 md:grid-cols-2 md:items-center">
                  {/* صورة القصة (مؤقتة) */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-copper)]/20">
                    <div className="absolute inset-0 flex items-center justify-center text-6xl text-[var(--color-copper)]/30">
                      {artisan.profileImage ? (
                        <img
                          src={artisan.profileImage}
                          alt={artisan.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{artisan.name.charAt(0)}</span>
                      )}
                    </div>

                    {/* فيديو (لو موجود) */}
                    {artisan.video && (
                      <div className="absolute bottom-4 left-4">
                        <a
                          href={artisan.video}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-[var(--color-espresso)]/80 px-4 py-2 text-xs font-medium text-[var(--color-ivory)] backdrop-blur-sm transition hover:bg-[var(--color-espresso)]"
                        >
                          ▶️ Watch video
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
                        {artisan.craft || "حرفي"}
                      </p>
                      <h2 className="mt-2 font-[var(--font-display)] text-3xl md:text-4xl text-[var(--color-espresso)]">
                        {artisan.name}
                      </h2>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {artisan.region || artisan.country}
                      </p>
                    </div>

                    {/* ملخص القصة */}
                    <p className="text-[var(--text-secondary)] leading-relaxed line-clamp-4">
                      {artisan.story}
                    </p>

                    <Link
                      href={`/artisan/${artisan.name
                        .toLowerCase()
                        .replace(/ /g, "-")}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-copper)] transition hover:gap-3 hover:text-[var(--color-espresso)]"
                    >
                      اقرأ القصة كاملة
                      <span className="text-lg">→</span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Bottom Navigation (للجوال) */}
      <nav className="bottom-nav md:hidden">
        <Link href="/" className="active">
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
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Header from "../components/Header";
import MobileBottomNav from "../components/MobileBottomNav";

type BlogPost = {
  key: string;
  publishedAt: string;
  coverImageUrl?: string | null;
  payload: {
    slug: string;
    titleAr: string;
    titleEn: string;
    excerptAr: string;
    excerptEn: string;
  };
};

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/blog", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setPosts(Array.isArray(data.posts) ? data.posts : []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setPosts([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      <section className="border-b border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
          <p className="section-eyebrow">IRTH Journal</p>
          <h1 className="mt-3 max-w-4xl font-[var(--font-display)] text-5xl leading-[1.05] text-[var(--color-espresso)] md:text-7xl">
            Stories, craft, and heritage.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
            مقالات من IRTH عن الحرف، الأماكن، المعرفة التراثية، والقصص المحيطة بالمنتجات والحرفيين.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[var(--container-max)] px-5 py-10 md:px-6 md:py-14">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-live="polite" aria-busy="true">
            {[0, 1, 2].map((item) => (
              <div key={item} className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
                <div className="aspect-[16/10] animate-pulse bg-[var(--surface-muted)]" />
                <div className="space-y-3 p-6">
                  <div className="h-3 w-24 animate-pulse rounded bg-[var(--surface-muted)]" />
                  <div className="h-7 w-4/5 animate-pulse rounded bg-[var(--surface-muted)]" />
                  <div className="h-16 animate-pulse rounded bg-[var(--surface-muted)]" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center text-[var(--text-secondary)]">
            لا توجد مقالات منشورة حاليًا.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.key}
                href={`/blog/${post.payload.slug}`}
                className="group overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[var(--color-espresso)]">
                  {post.coverImageUrl ? (
                    <img
                      src={post.coverImageUrl}
                      alt={post.payload.titleAr}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-espresso)] via-[var(--color-espresso)] to-[var(--color-copper)] opacity-90" />
                  )}
                  {!post.coverImageUrl && (
                    <div className="absolute inset-0 flex items-end p-6">
                      <span className="font-[var(--font-display)] text-3xl text-[var(--color-ivory)]/80">IRTH Journal</span>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-copper)]">
                    {new Date(post.publishedAt).toLocaleDateString("ar-EG")}
                  </p>
                  <h2 className="mt-3 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">{post.payload.titleAr}</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{post.payload.titleEn}</p>
                  <p className="mt-5 line-clamp-4 text-sm leading-7 text-[var(--text-secondary)]">{post.payload.excerptAr}</p>
                  <p className="mt-5 text-sm font-medium text-[var(--color-copper)]">اقرأ المقال →</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <MobileBottomNav />
    </main>
  );
}

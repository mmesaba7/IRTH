"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Header from "../components/Header";

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
    fetch("/api/blog", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => setPosts(Array.isArray(data.posts) ? data.posts : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />
      <section className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
        <p className="section-eyebrow">IRTH Journal</p>
        <h1 className="mt-3 font-[var(--font-display)] text-5xl text-[var(--color-espresso)] md:text-6xl">Stories, craft, and heritage.</h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">مقالات من IRTH عن الحرف، الأماكن، المعرفة التراثية، والقصص المحيطة بالمنتجات والحرفيين.</p>

        {loading ? (
          <p className="mt-12 text-sm text-[var(--text-secondary)]">Loading articles...</p>
        ) : posts.length === 0 ? (
          <div className="mt-12 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center text-[var(--text-secondary)]">لا توجد مقالات منشورة حاليًا.</div>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.key} href={`/blog/${post.payload.slug}`} className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
                {post.coverImageUrl && <img src={post.coverImageUrl} alt={post.payload.titleAr} className="aspect-[16/10] w-full object-cover" />}
                <div className="p-6">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-copper)]">{new Date(post.publishedAt).toLocaleDateString("ar-EG")}</p>
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
    </main>
  );
}

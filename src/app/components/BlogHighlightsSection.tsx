"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

const DEMO_JOURNAL_PHOTOS = [
  "https://images.unsplash.com/photo-1590605055494-3fe30e437490?auto=format&fit=crop&w=1400&q=82",
  "https://images.unsplash.com/photo-1756361771435-b60616ef968c?auto=format&fit=crop&w=1400&q=82",
  "https://images.unsplash.com/photo-1593466901025-8e34d32093d6?auto=format&fit=crop&w=1400&q=82",
];

export default function BlogHighlightsSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    fetch("/api/blog", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => setPosts(Array.isArray(data.posts) ? data.posts.slice(0, 3) : []))
      .catch(() => setPosts([]));
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className="border-y border-[var(--border-soft)] bg-[var(--surface-muted)]/60">
      <div className="irth-section">
        <div className="irth-section-heading">
          <div>
            <p className="section-eyebrow">IRTH Journal</p>
            <h2>Stories, materials, and places.</h2>
          </div>
          <Link href="/blog" className="irth-section-link">All articles <span aria-hidden="true">→</span></Link>
        </div>

        <div className="irth-horizontal-rail mt-8 md:grid md:grid-flow-row md:grid-cols-3 md:overflow-visible">
          {posts.map((post, index) => {
            const coverUrl = post.coverImageUrl ?? DEMO_JOURNAL_PHOTOS[index % DEMO_JOURNAL_PHOTOS.length];
            return (
              <Link
                key={post.key}
                href={`/blog/${post.payload.slug}`}
                className={`group overflow-hidden border border-[var(--border-soft)] bg-[var(--surface)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)] ${index === 0 ? "rounded-[var(--radius-xl)]" : "rounded-[var(--radius-md)]"}`}
              >
                <div className="relative overflow-hidden bg-[var(--color-petrol)]">
                  <img src={coverUrl} alt={post.payload.titleAr} className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]" />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--color-petrol-deep)]/40 to-transparent" />
                </div>
                <div className="p-5 md:p-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-copper)]">{new Date(post.publishedAt).toLocaleDateString("ar-EG")}</p>
                  <h3 className="mt-3 line-clamp-2 font-[var(--font-display)] text-2xl font-semibold leading-tight text-[var(--color-espresso)]">{post.payload.titleAr}</h3>
                  <p className="mt-2 line-clamp-1 text-xs text-[var(--text-muted)]">{post.payload.titleEn}</p>
                  <p className="mt-4 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">{post.payload.excerptAr}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

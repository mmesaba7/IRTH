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
    <section className="border-y border-[var(--border-soft)] bg-[var(--surface-muted)]">
      <div className="mx-auto max-w-[var(--container-max)] px-5 py-14 md:px-6 md:py-20">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="section-eyebrow">IRTH Journal</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--color-espresso)] md:text-5xl">Stories behind the craft.</h2>
          </div>
          <Link href="/blog" className="text-sm font-medium text-[var(--color-copper)] hover:underline">All articles →</Link>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.key} href={`/blog/${post.payload.slug}`} className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
              {post.coverImageUrl && <img src={post.coverImageUrl} alt={post.payload.titleAr} className="aspect-[16/10] w-full object-cover" />}
              <div className="p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-copper)]">{new Date(post.publishedAt).toLocaleDateString("ar-EG")}</p>
                <h3 className="mt-3 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">{post.payload.titleAr}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{post.payload.titleEn}</p>
                <p className="mt-4 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">{post.payload.excerptAr}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

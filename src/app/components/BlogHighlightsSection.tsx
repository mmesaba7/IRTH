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

const DEMO_COVER_ART = [
  {
    background: "radial-gradient(circle at 72% 28%, rgba(217,161,59,.72) 0 8%, transparent 8.5%), radial-gradient(ellipse at 48% 78%, #c45d2d 0 18%, #8f472c 18.5% 22%, transparent 22.5%), linear-gradient(145deg, #eadcc4 0 44%, #7c8977 44.5% 61%, #073b3c 61.5%)",
  },
  {
    background: "repeating-linear-gradient(45deg, rgba(217,161,59,.75) 0 3px, transparent 3px 22px), repeating-linear-gradient(-45deg, rgba(196,93,45,.48) 0 3px, transparent 3px 22px), linear-gradient(135deg, #073b3c, #062c38)",
  },
  {
    background: "radial-gradient(circle at 30% 35%, rgba(246,240,228,.88) 0 10%, transparent 10.5%), radial-gradient(circle at 66% 62%, rgba(217,161,59,.7) 0 15%, transparent 15.5%), linear-gradient(120deg, #7c8977 0 38%, #c45d2d 38.5% 66%, #073b3c 66.5%)",
  },
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
          {posts.map((post, index) => (
            <Link
              key={post.key}
              href={`/blog/${post.payload.slug}`}
              className={`group overflow-hidden border border-[var(--border-soft)] bg-[var(--surface)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)] ${index === 0 ? "rounded-[var(--radius-xl)]" : "rounded-[var(--radius-md)]"}`}
            >
              <div className="relative overflow-hidden bg-[var(--color-petrol)]">
                {post.coverImageUrl ? (
                  <img src={post.coverImageUrl} alt={post.payload.titleAr} className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]" />
                ) : (
                  <div
                    className="aspect-[16/10] w-full transition-transform duration-500 group-hover:scale-[1.035]"
                    style={DEMO_COVER_ART[index % DEMO_COVER_ART.length]}
                    role="img"
                    aria-label="Demo editorial artwork"
                  />
                )}
                <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,transparent_49%,rgba(246,240,228,.28)_50%,transparent_51%)] [background-size:42px_42px]" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--color-petrol-deep)]/40 to-transparent" />
                {!post.coverImageUrl && <span className="absolute bottom-4 left-4 rounded-full border border-white/25 bg-[var(--color-petrol-deep)]/55 px-3 py-1 text-[9px] font-bold uppercase tracking-[.18em] text-white/80 backdrop-blur-sm">IRTH Journal · Demo</span>}
              </div>
              <div className="p-5 md:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-copper)]">{new Date(post.publishedAt).toLocaleDateString("ar-EG")}</p>
                <h3 className="mt-3 line-clamp-2 font-[var(--font-display)] text-2xl font-semibold leading-tight text-[var(--color-espresso)]">{post.payload.titleAr}</h3>
                <p className="mt-2 line-clamp-1 text-xs text-[var(--text-muted)]">{post.payload.titleEn}</p>
                <p className="mt-4 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">{post.payload.excerptAr}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

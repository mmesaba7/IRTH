"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import Header from "../../components/Header";
import MobileBottomNav from "../../components/MobileBottomNav";

type BlogDocument = {
  publishedAt: string;
  payload: {
    slug: string;
    titleAr: string;
    titleEn: string;
    excerptAr: string;
    excerptEn: string;
    bodyAr: string;
    bodyEn: string;
  };
};

export default function BlogArticlePage() {
  const params = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogDocument | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slug = params?.slug;
    if (!slug) return;

    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/blog/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setPost(data.post ?? null);
        setCoverImageUrl(typeof data.coverImageUrl === "string" ? data.coverImageUrl : null);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setPost(null);
        setCoverImageUrl(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [params?.slug]);

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      <article className="mx-auto max-w-4xl px-5 py-12 md:px-6 md:py-20">
        <Link href="/blog" className="text-sm text-[var(--color-copper)] hover:underline">
          ← IRTH Journal
        </Link>

        {loading ? (
          <div className="mt-10 space-y-5" aria-live="polite" aria-busy="true">
            <div className="h-3 w-28 animate-pulse rounded bg-[var(--surface-muted)]" />
            <div className="h-12 w-4/5 animate-pulse rounded bg-[var(--surface-muted)]" />
            <div className="h-7 w-2/3 animate-pulse rounded bg-[var(--surface-muted)]" />
            <div className="aspect-[16/9] animate-pulse rounded-[var(--radius-xl)] bg-[var(--surface-muted)]" />
          </div>
        ) : !post ? (
          <div className="mt-10 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center text-[var(--text-secondary)]">
            المقال غير موجود أو غير منشور.
          </div>
        ) : (
          <>
            <header className="mt-10 border-b border-[var(--border-soft)] pb-10">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-copper)]">
                {new Date(post.publishedAt).toLocaleDateString("ar-EG")}
              </p>
              <h1
                className="mt-4 font-[var(--font-display)] text-4xl leading-tight text-[var(--color-espresso)] md:text-6xl"
                dir="rtl"
              >
                {post.payload.titleAr}
              </h1>
              <p className="mt-3 font-[var(--font-display)] text-2xl text-[var(--text-secondary)]" dir="ltr">
                {post.payload.titleEn}
              </p>
              <p className="mt-7 text-lg leading-9 text-[var(--text-secondary)]" dir="rtl">
                {post.payload.excerptAr}
              </p>
            </header>

            {coverImageUrl ? (
              <img
                src={coverImageUrl}
                alt={post.payload.titleAr}
                className="mt-10 aspect-[16/9] w-full rounded-[var(--radius-xl)] object-cover"
              />
            ) : (
              <div className="mt-10 flex aspect-[16/9] items-end rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--color-espresso)] via-[var(--color-espresso)] to-[var(--color-copper)] p-8 text-[var(--color-ivory)]">
                <span className="font-[var(--font-display)] text-4xl">IRTH Journal</span>
              </div>
            )}

            <div className="mt-12 pt-2">
              <div className="whitespace-pre-wrap text-base leading-9 text-[var(--text-primary)]" dir="rtl">
                {post.payload.bodyAr}
              </div>
            </div>

            <div className="mt-14 border-t border-[var(--border-soft)] pt-10" dir="ltr">
              <p className="section-eyebrow">English</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl text-[var(--color-espresso)]">
                {post.payload.titleEn}
              </h2>
              <p className="mt-5 text-base leading-8 text-[var(--text-secondary)]">{post.payload.excerptEn}</p>
              <div className="mt-8 whitespace-pre-wrap text-base leading-8 text-[var(--text-primary)]">
                {post.payload.bodyEn}
              </div>
            </div>
          </>
        )}
      </article>

      <MobileBottomNav />
    </main>
  );
}

import type { Metadata } from "next";
import { blogDocumentKey, parseBlogPayload } from "@/lib/cms/blog";
import { absoluteSiteUrl, defaultSocialImageUrl, getPublishedCmsPayload, resolveCmsMediaSignedUrl } from "@/lib/cms/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const raw = await getPublishedCmsPayload(blogDocumentKey(slug), "blog_post");
  const payload = parseBlogPayload(raw);
  if (!payload) return { title: "Blog" };

  const canonical = payload.seo.canonicalUrl ? absoluteSiteUrl(payload.seo.canonicalUrl) : absoluteSiteUrl(`/blog/${payload.slug}`);
  const ogImage = await resolveCmsMediaSignedUrl(payload.seo.ogImageAssetId) ?? defaultSocialImageUrl();

  return {
    title: payload.seo.titleEn,
    description: payload.seo.metaDescriptionEn,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: payload.seo.ogTitleEn,
      description: payload.seo.ogDescriptionEn,
      images: [ogImage],
    },
  };
}

export default function BlogArticleLayout({ children }: { children: React.ReactNode }) {
  return children;
}

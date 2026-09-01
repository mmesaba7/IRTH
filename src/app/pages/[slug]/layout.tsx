import type { Metadata } from "next";
import { parseStaticPagePayload, staticPageDocumentKey } from "@/lib/cms/staticPage";
import { absoluteSiteUrl, defaultSocialImageUrl, getPublishedCmsPayload } from "@/lib/cms/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const raw = await getPublishedCmsPayload(staticPageDocumentKey(slug), "static_page");
  const payload = parseStaticPagePayload(raw);
  if (!payload) return { title: "IRTH" };

  const canonical = payload.seo.canonicalUrl ? absoluteSiteUrl(payload.seo.canonicalUrl) : absoluteSiteUrl(`/pages/${payload.slug}`);

  return {
    title: payload.seo.titleEn,
    description: payload.seo.metaDescriptionEn,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: payload.seo.titleEn,
      description: payload.seo.metaDescriptionEn,
      images: [defaultSocialImageUrl()],
    },
  };
}

export default function StaticPageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

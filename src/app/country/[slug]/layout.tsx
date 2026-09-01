import type { Metadata } from "next";
import { countryContentDocumentKey, parseCountryContentPayload } from "@/lib/cms/country";
import { absoluteSiteUrl, defaultSocialImageUrl, getPublishedCmsPayload, resolveCmsMediaSignedUrl } from "@/lib/cms/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const raw = await getPublishedCmsPayload(countryContentDocumentKey(slug), "country_content");
  const payload = parseCountryContentPayload(raw);
  if (!payload) return { title: "Country" };

  const canonical = absoluteSiteUrl(`/country/${payload.slug}`);
  const ogImage = await resolveCmsMediaSignedUrl(payload.seo.ogImageAssetId ?? payload.coverImageAssetId) ?? defaultSocialImageUrl();

  return {
    title: payload.seo.titleEn,
    description: payload.seo.metaDescriptionEn,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: payload.seo.titleEn,
      description: payload.seo.metaDescriptionEn,
      images: [ogImage],
    },
  };
}

export default function CountryLayout({ children }: { children: React.ReactNode }) {
  return children;
}

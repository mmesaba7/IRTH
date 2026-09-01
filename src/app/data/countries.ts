export type PublicCountry = {
  // Identity
  id: string;
  slug: string;
  name: string;
  nameEn: string;

  // Public cultural content
  heroImage?: string;
  culturalDescription?: string;
  culturalVideo?: string;

  // Explore relationships
  crafts: string[];
  featuredArtisanSlugs: string[];
  featuredProductSlugs: string[];

  // Architecture Later:
  // allows country pages to connect to cultural articles
  // without building a full CMS in the current task.
  relatedArticleSlugs?: string[];
};

export type MarketConfig = {
  id: string;
  countrySlug: string;

  // Commerce configuration
  currency: string;
  currencySymbol: string;

  shippingCost: number;
  freeShippingThreshold: number;

  status: "active" | "inactive";

  createdAt: string;
  updatedAt?: string;
};

function publishedCountryCover(slug: string) {
  return `/api/homepage/country-cover/${encodeURIComponent(slug)}`;
}

export const publicCountries: Record<string, PublicCountry> = {
  egypt: {
    id: "country-1",
    slug: "egypt",
    name: "مصر",
    nameEn: "Egypt",
    heroImage: publishedCountryCover("egypt"),

    crafts: [],
    featuredArtisanSlugs: [],
    featuredProductSlugs: [],
    relatedArticleSlugs: [],
  },

  jordan: {
    id: "country-4",
    slug: "jordan",
    name: "الأردن",
    nameEn: "Jordan",
    heroImage: publishedCountryCover("jordan"),

    crafts: [],
    featuredArtisanSlugs: [],
    featuredProductSlugs: [],
    relatedArticleSlugs: [],
  },

  morocco: {
    id: "country-5",
    slug: "morocco",
    name: "المغرب",
    nameEn: "Morocco",
    heroImage: publishedCountryCover("morocco"),

    crafts: [],
    featuredArtisanSlugs: [],
    featuredProductSlugs: [],
    relatedArticleSlugs: [],
  },

  "saudi-arabia": {
    id: "country-2",
    slug: "saudi-arabia",
    name: "المملكة العربية السعودية",
    nameEn: "Saudi Arabia",
    heroImage: publishedCountryCover("saudi-arabia"),

    crafts: [],
    featuredArtisanSlugs: [],
    featuredProductSlugs: [],
    relatedArticleSlugs: [],
  },

  uae: {
    id: "country-3",
    slug: "uae",
    name: "الإمارات العربية المتحدة",
    nameEn: "UAE",
    heroImage: publishedCountryCover("uae"),

    crafts: [],
    featuredArtisanSlugs: [],
    featuredProductSlugs: [],
    relatedArticleSlugs: [],
  },
};
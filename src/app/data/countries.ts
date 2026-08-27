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

export const publicCountries: Record<string, PublicCountry> = {
  egypt: {
    id: "country-1",
    slug: "egypt",
    name: "مصر",
    nameEn: "Egypt",

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

    crafts: [],
    featuredArtisanSlugs: [],
    featuredProductSlugs: [],
    relatedArticleSlugs: [],
  },
};
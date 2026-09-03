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

const demoCountryPhotography: Partial<Record<string, string>> = {
  jordan: "https://images.unsplash.com/photo-1500120194857-62b493650979?auto=format&fit=crop&w=1400&q=82",
  morocco: "https://images.unsplash.com/photo-1655376407147-4acdf34667ff?auto=format&fit=crop&w=1400&q=82",
  "saudi-arabia": "https://images.unsplash.com/photo-1670762903850-231b08a54518?auto=format&fit=crop&w=1400&q=82",
  uae: "https://images.unsplash.com/photo-1745750434535-5943ef2fd31a?auto=format&fit=crop&w=1400&q=82",
};

function countryCover(slug: string) {
  return demoCountryPhotography[slug] ?? publishedCountryCover(slug);
}

export const publicCountries: Record<string, PublicCountry> = {
  egypt: {
    id: "country-1",
    slug: "egypt",
    name: "مصر",
    nameEn: "Egypt",
    heroImage: countryCover("egypt"),

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
    heroImage: countryCover("jordan"),

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
    heroImage: countryCover("morocco"),

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
    heroImage: countryCover("saudi-arabia"),

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
    heroImage: countryCover("uae"),

    crafts: [],
    featuredArtisanSlugs: [],
    featuredProductSlugs: [],
    relatedArticleSlugs: [],
  },
};
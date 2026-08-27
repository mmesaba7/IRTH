export type PublicArtisan = {
  slug: string;
  name: string;
  country: string;
  region: string;
  mainCraft: string;
  additionalCrafts: string[];
  bio: string;
  story: string;
  rating: number;
  reviewCount: number;
  imageLabel: string;
  profileImage?: string;
  video?: string;
};

// Temporary compatibility alias.
// Existing prototype pages can keep using "Artisan"
// until we migrate them one by one to "PublicArtisan".
export type Artisan = PublicArtisan;

export const artisans: Record<string, PublicArtisan> = {
  "ahmed-hassan": {
    slug: "ahmed-hassan",
    name: "Ahmed Hassan",
    country: "Egypt",
    region: "Upper Egypt",
    mainCraft: "Pottery",
    additionalCrafts: ["Clay work", "Traditional pottery"],
    bio:
      "A pottery artisan preserving traditional clay techniques through handmade objects rooted in the heritage of Upper Egypt.",
    story:
      "Ahmed works with natural clay and traditional shaping techniques passed through generations. Each piece is made by hand, carrying small variations that reflect the process and the person behind it.",
    rating: 4.9,
    reviewCount: 27,
    imageLabel: "Ahmed Hassan · Pottery artisan",
  },

  "amina-zahra": {
    slug: "amina-zahra",
    name: "Amina Zahra",
    country: "Morocco",
    region: "Morocco",
    mainCraft: "Textiles",
    additionalCrafts: ["Hand weaving", "Traditional patterns"],
    bio:
      "A textile artisan creating handwoven pieces inspired by Moroccan patterns, materials, and cultural memory.",
    story:
      "Amina's work brings together traditional weaving techniques and patterns shaped by place and memory. Every textile is created slowly by hand, allowing the character of the maker to remain visible in the finished piece.",
    rating: 4.8,
    reviewCount: 19,
    imageLabel: "Amina Zahra · Textile artisan",
  },

  "omar-khalil": {
    slug: "omar-khalil",
    name: "Omar Khalil",
    country: "Jordan",
    region: "Jordan",
    mainCraft: "Metalwork",
    additionalCrafts: ["Copper work", "Hand forging"],
    bio:
      "A metalwork artisan shaping copper by hand using traditional techniques rooted in Jordanian craft heritage.",
    story:
      "Omar works with copper through a process of hand forging and traditional surface treatment. The marks left on each piece are part of the craft itself, giving every object its own character.",
    rating: 4.9,
    reviewCount: 14,
    imageLabel: "Omar Khalil · Metalwork artisan",
  },
};
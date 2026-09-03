export type Product = {

  id?: string;

  slug: string;

  artisanSlug: string;

  name: string;

  artisan: string;

  country: string;

  price: number;

  category: string;

  accent: "terracotta" | "olive" | "copper";

  origin: string;

  artisanRole: string;

  objectLabel: string;

  description: string;

  material: string;

  story: string;

  status?: "pending" | "approved" | "rejected";

  dimensions?: string;

  weight?: string;

  madeToOrder?: boolean;

  preparationTime?: string;

  oneOfAKind?: boolean;

  customization?: boolean;

  imageNames?: string[];

  videoName?: string | null;

};

export const products: Record<string, Product> = {
  "clay-vessel": {
    slug: "clay-vessel",
    artisanSlug: "ahmed-hassan",
    name: "Handcrafted Clay Vessel",
    artisan: "Ahmed Hassan",
    country: "Egypt",
    price: 85,
    category: "Pottery",
    accent: "terracotta",
    origin: "Upper Egypt",
    artisanRole: "Pottery artisan",
    objectLabel: "Handmade pottery",
    description:
      "A handmade clay vessel shaped with traditional techniques and rooted in the material culture of Upper Egypt.",
    material:
      "Hand-shaped natural clay finished with traditional surface treatment.",
    story:
      "Made slowly, by hand, with each variation carrying the mark of its maker.",
  },

  "heritage-textile": {
    slug: "heritage-textile",
    artisanSlug: "amina-zahra",
    name: "Woven Heritage Textile",
    artisan: "Amina Zahra",
    country: "Morocco",
    price: 120,
    category: "Textiles",
    accent: "olive",
    origin: "Morocco",
    artisanRole: "Textile artisan",
    objectLabel: "Handwoven textile",
    description:
      "A handwoven textile carrying traditional Moroccan patterns, techniques, and the character of its maker.",
    material:
      "Natural fibers woven by hand using traditional Moroccan textile techniques.",
    story:
      "Every pattern carries a visual language shaped by place, memory, and generations of craft.",
  },

  "copper-piece": {
    slug: "copper-piece",
    artisanSlug: "omar-khalil",
    name: "Hand-forged Copper Piece",
    artisan: "Omar Khalil",
    country: "Jordan",
    price: 145,
    category: "Metalwork",
    accent: "copper",
    origin: "Jordan",
    artisanRole: "Metalwork artisan",
    objectLabel: "Hand-forged copper",
    description:
      "A hand-forged copper piece shaped through traditional metalworking techniques and rooted in Jordanian craft heritage.",
    material:
      "Hand-forged copper finished with traditional shaping and surface techniques.",
    story:
      "Forged by hand, each mark and variation reflects the process and personality of its maker.",
  },
};
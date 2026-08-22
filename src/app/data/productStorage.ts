
import type { Product } from "./products";

export type MarketplaceProduct = Product & {
  dimensions?: string;
  weight?: string;
  quantity?: number;
  madeToOrder?: boolean;
  preparationTime?: string;
  oneOfAKind?: boolean;
  customization?: boolean;
  images?: string[];
  video?: string | null;
};

const STORAGE_KEY = "irth-marketplace-products";

export function getCustomProducts(): MarketplaceProduct[] {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomProduct(product: MarketplaceProduct) {
  const existing = getCustomProducts();

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([...existing, product])
  );
}

export function deleteCustomProduct(slug: string) {
  const existing = getCustomProducts();

  const updated = existing.filter(
    (product) => product.slug !== slug
  );

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updated)
  );
}


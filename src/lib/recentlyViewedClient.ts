"use client";

const STORAGE_KEY = "irth-recently-viewed";

function parse(snapshot: string | null) {
  try {
    const value = JSON.parse(snapshot ?? "[]") as unknown;
    return Array.isArray(value)
      ? [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))]
      : [];
  } catch {
    return [];
  }
}

export function getLocalRecentlyViewed() {
  return typeof window === "undefined" ? [] : parse(localStorage.getItem(STORAGE_KEY)).slice(0, 20);
}

export function recordRecentlyViewed(slug: string) {
  const current = parse(localStorage.getItem(STORAGE_KEY));
  const updated = [slug, ...current.filter((item) => item !== slug)].slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  void fetch("/api/account/recently-viewed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  }).catch(() => undefined);
}

export async function loadRecentlyViewed() {
  const local = getLocalRecentlyViewed();
  try {
    const response = await fetch("/api/account/recently-viewed", { cache: "no-store" });
    if (!response.ok) return local;
    const body = await response.json() as { slugs?: unknown };
    const server = Array.isArray(body.slugs)
      ? body.slugs.filter((item): item is string => typeof item === "string")
      : [];
    return [...new Set([...local, ...server])].slice(0, 20);
  } catch {
    return local;
  }
}

export function clearRecentlyViewed() {
  localStorage.removeItem(STORAGE_KEY);
  void fetch("/api/account/recently-viewed", { method: "DELETE" }).catch(() => undefined);
}

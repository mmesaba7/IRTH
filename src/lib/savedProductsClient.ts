"use client";

const STORAGE_KEY = "irth-saved-products";
const EVENT_NAME = "irth-saved-updated";
const EMPTY = "[]";
let hydrationPromise: Promise<string[]> | null = null;

function parse(snapshot: string | null) {
  try {
    const value = JSON.parse(snapshot ?? EMPTY) as unknown;
    return Array.isArray(value)
      ? [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))]
      : [];
  } catch {
    return [];
  }
}

export function getSavedSnapshot() {
  return typeof window === "undefined" ? EMPTY : localStorage.getItem(STORAGE_KEY) ?? EMPTY;
}

export function getServerSavedSnapshot() {
  return EMPTY;
}

export function parseSavedSnapshot(snapshot: string) {
  return parse(snapshot);
}

export function subscribeToSaved(onStoreChange: () => void) {
  const local = () => onStoreChange();
  const storage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener(EVENT_NAME, local);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT_NAME, local);
    window.removeEventListener("storage", storage);
  };
}

function write(slugs: string[]) {
  const canonical = [...new Set(slugs)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(canonical));
  hydrationPromise = Promise.resolve(canonical);
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function ensureSavedProductsLoaded() {
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    const local = parse(localStorage.getItem(STORAGE_KEY));
    try {
      const response = await fetch("/api/account/saved", { cache: "no-store" });
      if (!response.ok) return local;
      const body = await response.json() as { slugs?: unknown };
      const server = Array.isArray(body.slugs)
        ? body.slugs.filter((item): item is string => typeof item === "string")
        : [];
      const merged = [...new Set([...local, ...server])];
      write(merged);
      if (local.some((slug) => !server.includes(slug))) {
        const mergeResponse = await fetch("/api/account/saved", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slugs: merged }),
        });
        if (mergeResponse.ok) {
          const mergedBody = await mergeResponse.json() as { slugs?: unknown };
          const canonical = Array.isArray(mergedBody.slugs)
            ? mergedBody.slugs.filter((item): item is string => typeof item === "string")
            : merged;
          write(canonical);
          return canonical;
        }
      }
      return merged;
    } catch {
      return local;
    }
  })();
  return hydrationPromise;
}

export function toggleSavedProduct(slug: string) {
  const current = parse(localStorage.getItem(STORAGE_KEY));
  const saved = current.includes(slug);
  const nextSaved = !saved;
  const updated = nextSaved
    ? [...new Set([...current, slug])]
    : current.filter((item) => item !== slug);
  write(updated);

  void fetch("/api/account/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, saved: nextSaved }),
  }).catch(() => undefined);

  return nextSaved;
}

export function removeSavedProduct(slug: string) {
  const current = parse(localStorage.getItem(STORAGE_KEY));
  if (!current.includes(slug)) return;
  write(current.filter((item) => item !== slug));
  void fetch("/api/account/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, saved: false }),
  }).catch(() => undefined);
}

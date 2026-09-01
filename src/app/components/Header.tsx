"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MarketSelector from "./MarketSelector";
import NotificationBell from "./NotificationBell";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const [isMounted, setIsMounted] = useState(false);
  const [mainLogoUrl, setMainLogoUrl] = useState<string | null>(null);

  const updateCounts = () => {
    const saved = JSON.parse(localStorage.getItem("irth-saved-products") || "[]");
    const cart = JSON.parse(localStorage.getItem("irth-cart") || "[]");
    setSavedCount(saved.length);
    setCartCount(cart.length);
  };

  useEffect(() => {
    const savedLocale = localStorage.getItem("irth-locale") as "ar" | "en" | null;
    if (savedLocale) setLocale(savedLocale);
    setIsMounted(true);
    updateCounts();
    window.addEventListener("irth-cart-updated", updateCounts);
    window.addEventListener("irth-saved-updated", updateCounts);
    return () => {
      window.removeEventListener("irth-cart-updated", updateCounts);
      window.removeEventListener("irth-saved-updated", updateCounts);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cms/brand", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = await response.json();
        const value = body?.assets?.mainLogoAssetId;
        return typeof value === "string" ? value : null;
      })
      .then((url) => {
        if (!cancelled) setMainLogoUrl(url);
      })
      .catch(() => {
        if (!cancelled) setMainLogoUrl(null);
      });
    return () => { cancelled = true; };
  }, []);

  const toggleLocale = () => {
    const newLocale = locale === "ar" ? "en" : "ar";
    setLocale(newLocale);
    localStorage.setItem("irth-locale", newLocale);
    window.location.reload();
  };

  return (
    <header className="border-b border-[var(--border-soft)] bg-[var(--background)]">
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex min-h-8 items-center font-[var(--font-display)] text-2xl tracking-[0.08em] text-[var(--color-espresso)]">
            {mainLogoUrl ? (
              <img src={mainLogoUrl} alt="IRTH" className="h-9 w-auto max-w-[150px] object-contain" />
            ) : (
              "IRTH"
            )}
          </Link>

          <nav className="hidden items-center gap-8 text-sm md:flex">
            <Link href="/crafts" className="transition-colors hover:text-[var(--color-copper)]">Discover</Link>
            <Link href="/crafts" className="transition-colors hover:text-[var(--color-copper)]">Crafts</Link>
            <Link href="/artisans" className="transition-colors hover:text-[var(--color-copper)]">Artisans</Link>
            <Link href="/countries" className="transition-colors hover:text-[var(--color-copper)]">Countries</Link>
            <Link href="/wholesale" className="transition-colors hover:text-[var(--color-copper)]">Wholesale</Link>
            <Link href="/recently-viewed" className="transition-colors hover:text-[var(--color-copper)]">Recently Viewed</Link>
            <Link href="/account/orders" className="transition-colors hover:text-[var(--color-copper)]">My Orders</Link>
          </nav>

          <div className="flex items-center gap-5">
            <button type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)} className="text-lg text-[var(--color-espresso)] transition-colors hover:text-[var(--color-copper)] md:hidden">{menuOpen ? "✕" : "☰"}</button>
            <Link href="/search" aria-label="Search" className="text-lg text-[var(--color-espresso)] transition-colors hover:text-[var(--color-copper)]">⌕</Link>
            <NotificationBell />
            <Link href="/saved" aria-label="Saved items" className="relative text-lg text-[var(--color-espresso)] transition-colors hover:text-[var(--color-copper)]">
              ♡
              {savedCount > 0 && <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-copper)] px-1 text-[10px] text-[var(--color-ivory)]">{savedCount}</span>}
            </Link>
            <Link href="/cart" aria-label="Shopping cart" className="relative text-lg text-[var(--color-espresso)] transition-colors hover:text-[var(--color-copper)]">
              🛒
              {cartCount > 0 && <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-copper)] px-1 text-[10px] text-[var(--color-ivory)]">{cartCount}</span>}
            </Link>
            <MarketSelector />
            {isMounted && <button type="button" onClick={toggleLocale} className="text-sm font-medium text-[var(--color-espresso)] transition-colors hover:text-[var(--color-copper)]">{locale === "ar" ? "🇬🇧 EN" : "🇪🇬 عربي"}</button>}
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-[var(--border-soft)] bg-[var(--background)] md:hidden">
          <nav className="mx-auto max-w-[var(--container-max)] px-6 py-6">
            <div className="flex flex-col gap-5 text-sm">
              <Link href="/crafts" onClick={() => setMenuOpen(false)} className="transition-colors hover:text-[var(--color-copper)]">Discover</Link>
              <Link href="/crafts" onClick={() => setMenuOpen(false)} className="transition-colors hover:text-[var(--color-copper)]">Crafts</Link>
              <Link href="/artisans" onClick={() => setMenuOpen(false)} className="transition-colors hover:text-[var(--color-copper)]">Artisans</Link>
              <Link href="/countries" onClick={() => setMenuOpen(false)} className="transition-colors hover:text-[var(--color-copper)]">Countries</Link>
              <Link href="/wholesale" onClick={() => setMenuOpen(false)} className="transition-colors hover:text-[var(--color-copper)]">Wholesale</Link>
              <Link href="/account/orders" onClick={() => setMenuOpen(false)} className="transition-colors hover:text-[var(--color-copper)]">My Orders</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

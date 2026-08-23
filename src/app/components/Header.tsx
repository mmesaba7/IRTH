"use client";

import { useEffect, useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const [isMounted, setIsMounted] = useState(false); // علامة التحميل

  const updateCounts = () => {
    const saved = JSON.parse(
      localStorage.getItem("irth-saved-products") || "[]"
    );
    const cart = JSON.parse(
      localStorage.getItem("irth-cart") || "[]"
    );
    setSavedCount(saved.length);
    setCartCount(cart.length);
  };

  // جلب اللغة من localStorage بعد التحميل
  useEffect(() => {
    const savedLocale = localStorage.getItem("irth-locale") as "ar" | "en" | null;
    if (savedLocale) {
      setLocale(savedLocale);
    }
    setIsMounted(true); // اتحمّلنا
    updateCounts();

    window.addEventListener("storage", updateCounts);
    window.addEventListener("irth-cart-updated", updateCounts);
    window.addEventListener("irth-saved-updated", updateCounts);

    return () => {
      window.removeEventListener("storage", updateCounts);
      window.removeEventListener("irth-cart-updated", updateCounts);
      window.removeEventListener("irth-saved-updated", updateCounts);
    };
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

          {/* Logo */}
          <a
            href="/"
            className="font-[var(--font-display)] text-2xl tracking-[0.08em] text-[var(--color-espresso)]"
          >
            IRTH
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-9 text-sm md:flex">
            <a href="#" className="transition-colors hover:text-[var(--color-copper)]">
              Discover
            </a>
            <a href="#" className="transition-colors hover:text-[var(--color-copper)]">
              Crafts
            </a>
            <a href="#" className="transition-colors hover:text-[var(--color-copper)]">
              Artisans
            </a>
            <a href="#" className="transition-colors hover:text-[var(--color-copper)]">
              Countries
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-5">

            {/* Mobile Menu */}
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-lg text-[var(--color-espresso)] transition-colors hover:text-[var(--color-copper)] md:hidden"
            >
              {menuOpen ? "✕" : "☰"}
            </button>

            {/* Search */}
            <button
              type="button"
              aria-label="Search"
              className="text-lg text-[var(--color-espresso)] transition-colors hover:text-[var(--color-copper)]"
            >
              ⌕
            </button>

            {/* Saved */}
            <a
              href="/saved"
              aria-label="Saved items"
              className="relative text-lg text-[var(--color-espresso)] transition-colors hover:text-[var(--color-copper)]"
            >
              ♡
              {savedCount > 0 && (
                <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-copper)] px-1 text-[10px] text-[var(--color-ivory)]">
                  {savedCount}
                </span>
              )}
            </a>

            {/* Cart */}
            <a
              href="/cart"
              aria-label="Shopping cart"
              className="relative text-lg text-[var(--color-espresso)] transition-colors hover:text-[var(--color-copper)]"
            >
              🛒
              {cartCount > 0 && (
                <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-copper)] px-1 text-[10px] text-[var(--color-ivory)]">
                  {cartCount}
                </span>
              )}
            </a>

            {/* ✅ زر اللغة الجديد (بيظهر بس بعد التحميل) */}
            {isMounted && (
              <button
                type="button"
                onClick={toggleLocale}
                className="text-sm font-medium text-[var(--color-espresso)] transition-colors hover:text-[var(--color-copper)]"
              >
                {locale === "ar" ? "🇬🇧 EN" : "🇪🇬 عربي"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {menuOpen && (
        <div className="border-t border-[var(--border-soft)] bg-[var(--background)] md:hidden">
          <nav className="mx-auto max-w-[var(--container-max)] px-6 py-6">
            <div className="flex flex-col gap-5 text-sm">
              <a
                href="#"
                onClick={() => setMenuOpen(false)}
                className="transition-colors hover:text-[var(--color-copper)]"
              >
                Discover
              </a>
              <a
                href="#"
                onClick={() => setMenuOpen(false)}
                className="transition-colors hover:text-[var(--color-copper)]"
              >
                Crafts
              </a>
              <a
                href="#"
                onClick={() => setMenuOpen(false)}
                className="transition-colors hover:text-[var(--color-copper)]"
              >
                Artisans
              </a>
              <a
                href="#"
                onClick={() => setMenuOpen(false)}
                className="transition-colors hover:text-[var(--color-copper)]"
              >
                Countries
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
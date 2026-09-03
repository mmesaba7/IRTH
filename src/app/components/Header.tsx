"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import MarketSelector from "./MarketSelector";
import NotificationBell from "./NotificationBell";
import IrthIcon from "./IrthIcon";

type AccountState = "loading" | "guest" | "customer" | "authenticated";

const primaryLinks = [
  { href: "/explore", label: "Discover" },
  { href: "/crafts", label: "Crafts" },
  { href: "/artisans", label: "Artisans" },
  { href: "/countries", label: "Countries" },
  { href: "/stories", label: "Stories" },
  { href: "/wholesale", label: "Wholesale" },
];

export default function Header() {
  const [supabase] = useState(() => createClient());
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const [isMounted, setIsMounted] = useState(false);
  const [mainLogoUrl, setMainLogoUrl] = useState<string | null>(null);
  const [accountState, setAccountState] = useState<AccountState>("loading");

  const updateCounts = () => {
    const saved = JSON.parse(localStorage.getItem("irth-saved-products") || "[]");
    const cart = JSON.parse(localStorage.getItem("irth-cart") || "[]");
    setSavedCount(Array.isArray(saved) ? saved.length : 0);
    setCartCount(Array.isArray(cart) ? cart.length : 0);
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

    const classifyAccount = async (userId: string | null) => {
      if (!userId) {
        if (!cancelled) setAccountState("guest");
        return;
      }

      const { data, error } = await supabase
        .from("user_accounts")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;
      setAccountState(!error && data ? "customer" : "authenticated");
    };

    supabase.auth.getUser().then(({ data }) => {
      void classifyAccount(data.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void classifyAccount(session?.user.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

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

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [menuOpen]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1280px)");
    const closeAtDesktop = () => {
      if (desktopQuery.matches) setMenuOpen(false);
    };
    closeAtDesktop();
    desktopQuery.addEventListener("change", closeAtDesktop);
    return () => desktopQuery.removeEventListener("change", closeAtDesktop);
  }, []);

  const toggleLocale = () => {
    const newLocale = locale === "ar" ? "en" : "ar";
    setLocale(newLocale);
    localStorage.setItem("irth-locale", newLocale);
    window.location.reload();
  };

  const accountLink = accountState === "guest"
    ? { href: "/account/login", label: "Login" }
    : accountState === "customer"
      ? { href: "/account", label: "Account" }
      : null;

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--color-petrol)] text-[var(--color-ivory)] shadow-[0_8px_28px_rgba(6,44,56,0.12)]">
      <div className="mx-auto max-w-[var(--container-max)] px-4 sm:px-5 md:px-6">
        <div className="flex min-h-[68px] items-center justify-between gap-4 md:min-h-[76px]">
          <div className="flex min-w-0 items-center gap-3 xl:gap-7">
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
              className="irth-icon-button xl:hidden"
            >
              <IrthIcon name={menuOpen ? "close" : "menu"} className="h-5 w-5" />
            </button>

            <Link href="/" className="flex min-h-9 shrink-0 items-center text-[var(--color-ivory)]">
              {mainLogoUrl ? (
                <img src={mainLogoUrl} alt="IRTH" className="h-9 w-auto max-w-[138px] object-contain" />
              ) : (
                <span className="font-[var(--font-display)] text-[1.65rem] font-semibold tracking-[0.13em]">IRTH</span>
              )}
            </Link>

            <nav className="hidden items-center gap-4 text-[13px] font-medium xl:flex xl:gap-6">
              {primaryLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-[var(--color-ivory)]/78 transition-colors hover:text-[var(--color-antique-gold)]">
                  {link.label}
                </Link>
              ))}
              <details className="group relative">
                <summary className="cursor-pointer list-none text-[var(--color-ivory)]/66 transition-colors hover:text-[var(--color-antique-gold)]">More</summary>
                <div className="absolute left-0 top-full mt-3 min-w-44 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] py-2 text-[var(--text-primary)] shadow-[var(--shadow-elevated)]">
                  <Link href="/recently-viewed" className="block px-4 py-2.5 text-sm hover:bg-[var(--surface-muted)]">Recently Viewed</Link>
                  <Link href="/account/orders" className="block px-4 py-2.5 text-sm hover:bg-[var(--surface-muted)]">My Orders</Link>
                </div>
              </details>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link href="/search" aria-label="Search" className="irth-icon-button">
              <IrthIcon name="search" className="h-5 w-5" />
            </Link>

            <div className="hidden items-center gap-2 md:flex">
              <NotificationBell />
              <Link href="/saved" aria-label="Saved items" className="irth-icon-button relative">
                <IrthIcon name="heart" className="h-5 w-5" />
                {savedCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-copper)] px-1 text-[9px] text-white">{savedCount > 99 ? "99+" : savedCount}</span>}
              </Link>
            </div>

            <Link href="/cart" aria-label="Shopping cart" className="irth-icon-button relative">
              <IrthIcon name="cart" className="h-5 w-5" />
              {cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-copper)] px-1 text-[9px] text-white">{cartCount > 99 ? "99+" : cartCount}</span>}
            </Link>

            <div className="hidden items-center gap-3 xl:flex">
              <div className="border-s border-white/15 ps-3"><MarketSelector /></div>
              {isMounted && (
                <button type="button" onClick={toggleLocale} className="text-xs font-semibold text-[var(--color-ivory)]/75 transition hover:text-[var(--color-antique-gold)]">
                  {locale === "ar" ? "EN" : "عربي"}
                </button>
              )}
              {accountLink && (
                <Link href={accountLink.href} aria-label={accountLink.label} className="irth-icon-button">
                  <IrthIcon name="user" className="h-5 w-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 top-[68px] z-40 overflow-y-auto bg-[var(--color-petrol-deep)] text-[var(--color-ivory)] md:top-[76px] xl:hidden">
          <div className="mx-auto flex min-h-full max-w-xl flex-col px-6 pb-10 pt-8">
            <div className="grid gap-1">
              {primaryLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={closeMenu} className="flex items-center justify-between border-b border-white/8 py-4 text-lg font-medium">
                  <span>{link.label}</span><span className="text-[var(--color-antique-gold)]">›</span>
                </Link>
              ))}
              <Link href="/blog" onClick={closeMenu} className="flex items-center justify-between border-b border-white/8 py-4 text-lg font-medium"><span>Journal</span><span className="text-[var(--color-antique-gold)]">›</span></Link>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <Link href="/recently-viewed" onClick={closeMenu} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-white/10 bg-white/5 p-4 text-sm"><IrthIcon name="compass" className="h-5 w-5 text-[var(--color-antique-gold)]" />Recently viewed</Link>
              <Link href="/account/orders" onClick={closeMenu} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-white/10 bg-white/5 p-4 text-sm"><IrthIcon name="orders" className="h-5 w-5 text-[var(--color-antique-gold)]" />My orders</Link>
              <Link href="/saved" onClick={closeMenu} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-white/10 bg-white/5 p-4 text-sm"><IrthIcon name="heart" className="h-5 w-5 text-[var(--color-antique-gold)]" />Saved {savedCount > 0 ? `(${savedCount})` : ""}</Link>
              {accountLink ? <Link href={accountLink.href} onClick={closeMenu} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-white/10 bg-white/5 p-4 text-sm"><IrthIcon name="user" className="h-5 w-5 text-[var(--color-antique-gold)]" />{accountLink.label}</Link> : <div className="rounded-[var(--radius-md)] border border-white/10 bg-white/5 p-4 text-sm text-white/45">Account unavailable for this role</div>}
            </div>

            <div className="mt-8 rounded-[var(--radius-lg)] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold">Notifications</span>
                <NotificationBell />
              </div>
              <div className="mt-5 border-t border-white/10 pt-5">
                <p className="mb-3 text-xs uppercase tracking-[.16em] text-[var(--color-antique-gold)]">Market</p>
                <MarketSelector />
              </div>
              {isMounted && (
                <button type="button" onClick={toggleLocale} className="mt-5 flex w-full items-center justify-between border-t border-white/10 pt-5 text-sm">
                  <span>Language</span><span className="font-semibold text-[var(--color-antique-gold)]">{locale === "ar" ? "English" : "العربية"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

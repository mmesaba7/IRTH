"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Country = {
  id: string;
  slug: string;
  isoCode: string;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  artisanCount: number;
  activeArtisanCount: number;
  publishedProductCount: number;
  activeMarketCount: number;
};

export default function AdminCountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/structure", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to load countries.");
      setCountries(Array.isArray(body?.countries) ? body.countries : []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load countries."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggle(country: Country) {
    if (working) return;
    setWorking(country.id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/structure", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: "country", id: country.id, active: !country.isActive, reason: reason.trim() || null }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to update country.");
      setMessage(`Country ${country.isActive ? "deactivated" : "activated"} and recorded in audit history.`);
      setReason(""); await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to update country."); }
    finally { setWorking(null); }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-20 text-[var(--text-primary)]">
      <section className="mx-auto max-w-5xl px-6 py-10 md:py-16">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-6"><div><p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Admin Panel</p><h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Countries</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Country records are separate from Market, currency, and shipping configuration. An active Market or Artisan blocks deactivation.</p></div><Link href="/dashboard-admin/dashboard" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm">← Dashboard</Link></div>
        {message && <div className="mt-5 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}{error && <div className="mt-5 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="Change reason (optional)" className="mt-6 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm" />
        {loading ? <p className="mt-10 text-sm text-[var(--text-secondary)]">Loading…</p> : <div className="mt-6 space-y-4">{countries.map((country) => <article key={country.id} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-[var(--color-espresso)]">{country.nameAr} / {country.nameEn} · {country.isoCode}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{country.activeArtisanCount} active artisans · {country.publishedProductCount} published products · {country.activeMarketCount} active markets</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs ${country.isActive ? "bg-green-50 text-green-700" : "bg-[var(--surface-muted)] text-[var(--text-muted)]"}`}>{country.isActive ? "Active" : "Inactive"}</span><button disabled={Boolean(working)} onClick={() => void toggle(country)} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm disabled:opacity-50">{country.isActive ? "Deactivate" : "Activate"}</button></div></div></article>)}</div>}
      </section>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Artisan = {
  id: string;
  slug: string;
  nameAr: string | null;
  nameEn: string;
  status: string;
  countryName: string;
  primaryCraftName: string;
  hasAuthAccount: boolean;
  publishedProductCount: number;
  createdAt: string;
};

const STATUSES = ["pending_verification", "active", "under_review", "suspended", "deactivated"];

export default function AdminArtisansPage() {
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
      if (!response.ok) throw new Error(body?.error || "Unable to load Artisans.");
      setArtisans(Array.isArray(body?.artisans) ? body.artisans : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Artisans.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => artisans.filter((artisan) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [artisan.nameAr ?? "", artisan.nameEn, artisan.slug, artisan.countryName, artisan.primaryCraftName].some((value) => value.toLowerCase().includes(q));
    return matchesSearch && (statusFilter === "all" || artisan.status === statusFilter);
  }), [artisans, search, statusFilter]);

  async function changeStatus(artisan: Artisan, status: string) {
    if (working || status === artisan.status) return;
    setWorking(artisan.id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/structure", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: "artisan", id: artisan.id, status, reason: reason.trim() || null }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to update Artisan.");
      setMessage("Artisan status updated and recorded in the audit trail.");
      setReason("");
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to update Artisan."); }
    finally { setWorking(null); }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-20 text-[var(--text-primary)]">
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-6">
          <div><p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Admin Panel</p><h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Artisans</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Real Artisan profiles and marketplace status.</p></div>
          <Link href="/dashboard-admin/dashboard" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm">← Dashboard</Link>
        </div>
        {message && <div className="mt-5 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-5 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search artisans…" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm"><option value="all">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select><input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="Change reason (optional)" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm" /></div>
        {loading ? <p className="mt-10 text-sm text-[var(--text-secondary)]">Loading…</p> : <div className="mt-6 space-y-4">{filtered.map((artisan) => <article key={artisan.id} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-medium text-[var(--color-espresso)]">{artisan.nameAr || artisan.nameEn}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{artisan.countryName} · {artisan.primaryCraftName} · {artisan.publishedProductCount} published products</p><p className="mt-1 text-xs text-[var(--text-muted)]">Account: {artisan.hasAuthAccount ? "linked" : "not linked"}</p></div><select disabled={Boolean(working)} value={artisan.status} onChange={(e) => void changeStatus(artisan, e.target.value)} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-2 text-sm capitalize">{STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></div></article>)}</div>}
      </section>
    </main>
  );
}

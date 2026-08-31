"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type CraftConfig = {
  craftId: string;
  slug: string;
  nameAr: string | null;
  nameEn: string;
  ratePercent: number | string | null;
  updatedAt: string | null;
};

type ArtisanConfig = {
  artisanId: string;
  slug: string;
  nameAr: string | null;
  nameEn: string;
  primaryCraftId: string;
  primaryCraftNameEn: string;
  craftRatePercent: number | string | null;
  overrideRatePercent: number | string | null;
  effectiveRatePercent: number | string | null;
  updatedAt: string | null;
};

type HistoryItem = {
  id: string;
  scopeType: "craft" | "artisan";
  craftId: string | null;
  artisanId: string | null;
  oldRatePercent: number | string | null;
  newRatePercent: number | string | null;
  reason: string | null;
  changedAt: string;
};

type CommissionConfig = {
  crafts: CraftConfig[];
  artisans: ArtisanConfig[];
  history: HistoryItem[];
};

export default function AdminCommissionPage() {
  const [config, setConfig] = useState<CommissionConfig>({ crafts: [], artisans: [], history: [] });
  const [craftDrafts, setCraftDrafts] = useState<Record<string, string>>({});
  const [artisanDrafts, setArtisanDrafts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/commission", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to load commission configuration.");
      const next: CommissionConfig = {
        crafts: Array.isArray(body?.crafts) ? body.crafts : [],
        artisans: Array.isArray(body?.artisans) ? body.artisans : [],
        history: Array.isArray(body?.history) ? body.history : [],
      };
      setConfig(next);
      setCraftDrafts(Object.fromEntries(next.crafts.map((craft) => [craft.craftId, craft.ratePercent === null ? "" : String(craft.ratePercent)])));
      setArtisanDrafts(Object.fromEntries(next.artisans.map((artisan) => [artisan.artisanId, artisan.overrideRatePercent === null ? "" : String(artisan.overrideRatePercent)])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load commission configuration.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(target: "craft" | "artisan", id: string, rawRate: string | null) {
    if (working) return;
    const ratePercent = rawRate === null || rawRate.trim() === "" ? null : Number(rawRate);
    if (target === "craft" && ratePercent === null) {
      setError("Craft default rate is required.");
      return;
    }
    if (ratePercent !== null && (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100)) {
      setError("Commission rate must be between 0 and 100.");
      return;
    }

    setWorking(`${target}:${id}`);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/commission", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, id, ratePercent, reason: reason.trim() || null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to save commission configuration.");
      setMessage(target === "artisan" && ratePercent === null ? "Artisan override removed; craft default is active." : "Commission configuration saved.");
      setReason("");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save commission configuration.");
    } finally {
      setWorking(null);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[var(--background)]"><div className="flex h-96 items-center justify-center text-[var(--text-secondary)]">Loading trusted commission configuration…</div></main>;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-20 text-[var(--text-primary)]">
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Admin Panel</p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Commission Configuration</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Craft rates are the default. An Artisan override takes priority for that Artisan. Orders keep the commission rate snapshotted at purchase time, so changing configuration does not rewrite historical orders.
            </p>
          </div>
          <Link href="/dashboard-admin/dashboard" className="self-start rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)]">← Dashboard</Link>
        </div>

        {message && <div className="mt-5 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-5 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
          <label className="text-sm font-medium text-[var(--color-espresso)]">Change reason (optional, stored in audit history)</label>
          <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} placeholder="Example: commercial agreement update" className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]" />
        </div>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-olive)]">Defaults</p>
              <h2 className="mt-1 font-[var(--font-display)] text-3xl text-[var(--color-espresso)]">Craft commission rates</h2>
            </div>
            <span className="text-xs text-[var(--text-muted)]">{config.crafts.length} active crafts</span>
          </div>

          <div className="mt-5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
            {config.crafts.map((craft) => (
              <div key={craft.craftId} className="flex flex-col gap-4 border-b border-[var(--border-soft)] p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-[var(--color-espresso)]">{craft.nameAr || craft.nameEn}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{craft.nameEn} · {craft.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input type="number" min="0" max="100" step="0.01" value={craftDrafts[craft.craftId] ?? ""} onChange={(event) => setCraftDrafts((current) => ({ ...current, [craft.craftId]: event.target.value }))} className="w-28 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-3 py-2 pr-7 text-sm" />
                    <span className="pointer-events-none absolute right-3 top-2 text-sm text-[var(--text-muted)]">%</span>
                  </div>
                  <button disabled={Boolean(working)} onClick={() => void save("craft", craft.craftId, craftDrafts[craft.craftId] ?? "")} className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-4 py-2 text-sm text-[var(--color-ivory)] disabled:opacity-50">Save</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-[var(--border-soft)] pt-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-olive)]">Overrides</p>
            <h2 className="mt-1 font-[var(--font-display)] text-3xl text-[var(--color-espresso)]">Artisan overrides</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Leave an override empty and choose “Use craft default” to remove a custom rate.</p>
          </div>

          <div className="mt-5 space-y-4">
            {config.artisans.map((artisan) => (
              <article key={artisan.artisanId} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-medium text-[var(--color-espresso)]">{artisan.nameAr || artisan.nameEn}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{artisan.primaryCraftNameEn} · Craft default {artisan.craftRatePercent ?? "Not configured"}%</p>
                    <p className="mt-2 text-sm text-[var(--color-copper)]">Effective rate: {artisan.effectiveRatePercent ?? "Not configured"}%</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <input type="number" min="0" max="100" step="0.01" value={artisanDrafts[artisan.artisanId] ?? ""} onChange={(event) => setArtisanDrafts((current) => ({ ...current, [artisan.artisanId]: event.target.value }))} placeholder="Override %" className="w-32 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-3 py-2 text-sm" />
                    <button disabled={Boolean(working) || !(artisanDrafts[artisan.artisanId] ?? "").trim()} onClick={() => void save("artisan", artisan.artisanId, artisanDrafts[artisan.artisanId] ?? "")} className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-4 py-2 text-sm text-[var(--color-ivory)] disabled:opacity-50">Save override</button>
                    <button disabled={Boolean(working) || artisan.overrideRatePercent === null} onClick={() => void save("artisan", artisan.artisanId, null)} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--color-espresso)] disabled:opacity-50">Use craft default</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-[var(--border-soft)] pt-10">
          <h2 className="font-[var(--font-display)] text-3xl text-[var(--color-espresso)]">Audit history</h2>
          {config.history.length === 0 ? (
            <div className="mt-5 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-6 text-sm text-[var(--text-secondary)]">No commission configuration changes have been recorded since audit history was enabled.</div>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  <tr><th className="px-5 py-3">When</th><th className="px-5 py-3">Scope</th><th className="px-5 py-3">Old</th><th className="px-5 py-3">New</th><th className="px-5 py-3">Reason</th></tr>
                </thead>
                <tbody>
                  {config.history.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--border-soft)]">
                      <td className="px-5 py-3 text-[var(--text-muted)]">{new Date(item.changedAt).toLocaleString("en-GB")}</td>
                      <td className="px-5 py-3 capitalize">{item.scopeType}</td>
                      <td className="px-5 py-3">{item.oldRatePercent === null ? "—" : `${item.oldRatePercent}%`}</td>
                      <td className="px-5 py-3">{item.newRatePercent === null ? "Craft default" : `${item.newRatePercent}%`}</td>
                      <td className="px-5 py-3 text-[var(--text-secondary)]">{item.reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

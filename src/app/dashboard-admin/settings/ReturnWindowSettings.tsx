"use client";

import { useEffect, useState } from "react";

type ReturnMarket = {
  market_id: string;
  slug: string;
  currency_code: string;
  return_window_days: number | null;
};

export default function ReturnWindowSettings() {
  const [markets, setMarkets] = useState<ReturnMarket[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/return-settings", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || "Unable to load return settings.");
        const rows = Array.isArray(body?.markets) ? body.markets as ReturnMarket[] : [];
        setMarkets(rows);
        setDrafts(Object.fromEntries(rows.map((market) => [market.market_id, String(market.return_window_days ?? "")])));
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "Unable to load return settings.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function save(market: ReturnMarket) {
    const raw = drafts[market.market_id]?.trim() ?? "";
    if (!/^\d+$/.test(raw)) {
      setError("Return window must be a whole number of days, zero or greater.");
      return;
    }
    const days = Number(raw);
    setSaving(market.market_id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/return-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: market.market_id,
          days,
          reason: `Updated from IRTH Admin Settings: ${market.return_window_days ?? "unset"} → ${days} days`,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to update return window.");
      setMarkets((current) => current.map((item) => item.market_id === market.market_id ? { ...item, return_window_days: days } : item));
      setMessage(`${market.slug}: Return Window is now ${days} days for future deliveries.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update return window.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-olive)]">Return Policy</p>
        <h2 className="mt-2 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Return Window</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          The configured value is snapshotted when each Artisan shipment is delivered. Changing it here never changes an already-delivered shipment retroactively.
        </p>
      </div>

      {message && <div className="mt-5 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}
      {error && <div className="mt-5 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <p className="mt-6 text-sm text-[var(--text-secondary)]">Loading return settings…</p>
      ) : markets.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--text-secondary)]">No active Markets found.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {markets.map((market) => (
            <div key={market.market_id} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <label htmlFor={`return-days-${market.market_id}`} className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                    {market.slug} — days after delivery
                  </label>
                  <input
                    id={`return-days-${market.market_id}`}
                    inputMode="numeric"
                    value={drafts[market.market_id] ?? ""}
                    onChange={(event) => {
                      setDrafts((current) => ({ ...current, [market.market_id]: event.target.value }));
                      setError("");
                      setMessage("");
                    }}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)] sm:max-w-xs"
                  />
                  <p className="mt-2 text-xs text-[var(--text-muted)]">Current: {market.return_window_days ?? "not configured"} days · Currency: {market.currency_code}</p>
                </div>
                <button
                  type="button"
                  onClick={() => save(market)}
                  disabled={Boolean(saving)}
                  className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-5 py-3 text-sm font-medium text-[var(--color-ivory)] hover:bg-[var(--color-copper)] disabled:opacity-50"
                >
                  {saving === market.market_id ? "Saving…" : "Save Return Window"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-xs leading-6 text-[var(--text-secondary)]">
        Initial IRTH MVP value: <strong>14 days</strong>. If legal or operational requirements change, update the Market here. Existing delivered shipments keep the snapshot that was active at their delivery time.
      </div>
    </section>
  );
}

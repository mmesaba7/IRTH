"use client";

import { useEffect, useState } from "react";

type TaxMarket = {
  market_id: string;
  slug: string;
  currency_code: string;
  tax_rate_percent: string | number;
};

export default function TaxSettings() {
  const [markets, setMarkets] = useState<TaxMarket[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/admin/tax-settings", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || "Unable to load tax settings.");

        const rows = Array.isArray(body?.markets) ? body.markets as TaxMarket[] : [];
        setMarkets(rows);
        setDrafts(Object.fromEntries(rows.map((market) => [market.market_id, String(market.tax_rate_percent)])));
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load tax settings.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  async function save(market: TaxMarket) {
    const raw = drafts[market.market_id]?.trim() ?? "";
    if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(raw) || Number(raw) > 100) {
      setError("Tax rate must be between 0% and 100%, with at most two decimal places.");
      return;
    }

    setSaving(market.market_id);
    setError("");
    setMessage("");

    try {
      const previous = String(market.tax_rate_percent);
      const response = await fetch("/api/admin/tax-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          marketId: market.market_id,
          ratePercent: raw,
          reason: `Updated from IRTH Admin Settings: ${previous}% → ${raw}%`,
        }),
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to update tax rate.");

      const savedRate = String(body.taxRatePercent ?? raw);
      setMarkets((current) => current.map((item) =>
        item.market_id === market.market_id
          ? { ...item, tax_rate_percent: savedRate }
          : item
      ));
      setDrafts((current) => ({ ...current, [market.market_id]: savedRate }));
      setMessage(`${market.slug}: Tax rate is now ${savedRate}% for future Order Items.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update tax rate.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-olive)]">Tax</p>
        <h2 className="mt-2 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Tax Settings</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          Product prices shown to customers are tax-inclusive. Changing this rate does not add tax on top of Checkout prices; it changes the internal tax snapshot deducted from Artisan settlement for future Order Items only.
        </p>
      </div>

      {message && <div className="mt-5 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}
      {error && <div className="mt-5 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <p className="mt-6 text-sm text-[var(--text-secondary)]">Loading tax settings…</p>
      ) : markets.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--text-secondary)]">No active Markets found.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {markets.map((market) => (
            <div key={market.market_id} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <label htmlFor={`tax-rate-${market.market_id}`} className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                    {market.slug} — inclusive tax rate (%)
                  </label>
                  <input
                    id={`tax-rate-${market.market_id}`}
                    inputMode="decimal"
                    value={drafts[market.market_id] ?? ""}
                    onChange={(event) => {
                      setDrafts((current) => ({ ...current, [market.market_id]: event.target.value }));
                      setError("");
                      setMessage("");
                    }}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)] sm:max-w-xs"
                  />
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Current: {String(market.tax_rate_percent)}% · Currency: {market.currency_code}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => save(market)}
                  disabled={Boolean(saving)}
                  className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-5 py-3 text-sm font-medium text-[var(--color-ivory)] hover:bg-[var(--color-copper)] disabled:opacity-50"
                >
                  {saving === market.market_id ? "Saving…" : "Save Tax Rate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-xs leading-6 text-[var(--text-secondary)]">
        Egypt MVP starts at <strong>14% inclusive VAT</strong>. Example: a 1,000 EGP tax-inclusive settlement base contains 122.81 EGP tax at 14%. Existing Order Items keep their historical snapshot when the setting changes.
      </div>
    </section>
  );
}

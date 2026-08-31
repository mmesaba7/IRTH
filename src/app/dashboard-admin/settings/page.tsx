"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReturnWindowSettings from "./ReturnWindowSettings";

type ShippingMarket = {
  id: string;
  slug: string;
  currencyCode: string;
  flatShippingFee: string | null;
  freeShippingThreshold: string | null;
};

type ShippingDraft = {
  flatShippingFee: string;
  freeShippingThreshold: string;
};

export default function AdminSettingsPage() {
  const [markets, setMarkets] = useState<ShippingMarket[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ShippingDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingMarketId, setSavingMarketId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/admin/shipping-settings", {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          markets?: ShippingMarket[];
          error?: string;
        };

        if (controller.signal.aborted) return;
        if (!response.ok || !payload.markets) {
          setError(payload.error ?? "Unable to load shipping settings.");
          return;
        }

        setMarkets(payload.markets);
        setDrafts(
          Object.fromEntries(
            payload.markets.map((market) => [
              market.id,
              {
                flatShippingFee: market.flatShippingFee ?? "",
                freeShippingThreshold: market.freeShippingThreshold ?? "",
              },
            ])
          )
        );
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Could not load shipping settings:", requestError);
        setError("Unable to load shipping settings.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const updateDraft = (
    marketId: string,
    field: keyof ShippingDraft,
    value: string
  ) => {
    setDrafts((current) => ({
      ...current,
      [marketId]: {
        ...(current[marketId] ?? {
          flatShippingFee: "",
          freeShippingThreshold: "",
        }),
        [field]: value,
      },
    }));
    setMessage("");
    setError("");
  };

  const saveShipping = async (market: ShippingMarket) => {
    const draft = drafts[market.id];
    if (!draft || savingMarketId) return;

    setSavingMarketId(market.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/shipping-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          marketId: market.id,
          flatShippingFee: draft.flatShippingFee,
          freeShippingThreshold: draft.freeShippingThreshold,
        }),
      });

      const payload = (await response.json()) as {
        setting?: {
          flatShippingFee?: string;
          freeShippingThreshold?: string;
        };
        flatShippingFee?: string;
        freeShippingThreshold?: string;
        error?: string;
      };

      const flatShippingFee =
        payload.setting?.flatShippingFee ?? payload.flatShippingFee;
      const freeShippingThreshold =
        payload.setting?.freeShippingThreshold ?? payload.freeShippingThreshold;

      if (!response.ok || !flatShippingFee || !freeShippingThreshold) {
        setError(payload.error ?? "Unable to save shipping settings.");
        return;
      }

      setMarkets((current) =>
        current.map((item) =>
          item.id === market.id
            ? { ...item, flatShippingFee, freeShippingThreshold }
            : item
        )
      );
      setDrafts((current) => ({
        ...current,
        [market.id]: { flatShippingFee, freeShippingThreshold },
      }));
      setMessage(`${market.slug} shipping settings saved.`);
    } catch (requestError) {
      console.error("Could not save shipping settings:", requestError);
      setError("Unable to save shipping settings.");
    } finally {
      setSavingMarketId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Admin Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              Market Settings
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Trusted Market-level settings for Shipping and the Return Window.
            </p>
          </div>
          <Link
            href="/dashboard-admin/dashboard"
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <section className="mt-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-olive)]">
              Shipping
            </p>
            <h2 className="mt-2 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
              Shipping Settings
            </h2>
          </div>

          {message && (
            <div className="mt-6 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">
              {message}
            </div>
          )}
          {error && (
            <div className="mt-6 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
              <p className="text-sm text-[var(--text-secondary)]">Loading shipping settings…</p>
            </div>
          ) : markets.length === 0 ? (
            <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
              <p className="text-sm text-[var(--text-secondary)]">No active Markets found.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {markets.map((market) => {
                const draft = drafts[market.id] ?? {
                  flatShippingFee: "",
                  freeShippingThreshold: "",
                };
                const isSaving = savingMarketId === market.id;

                return (
                  <section
                    key={market.id}
                    className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="font-[var(--font-display)] text-2xl capitalize text-[var(--color-espresso)]">
                        {market.slug}
                      </h3>
                      <span className="w-fit rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                        {market.currencyCode}
                      </span>
                    </div>

                    <div className="mt-6 grid gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`shipping-fee-${market.id}`} className="mb-2 block text-sm text-[var(--text-secondary)]">
                          Flat shipping fee ({market.currencyCode})
                        </label>
                        <input
                          id={`shipping-fee-${market.id}`}
                          inputMode="decimal"
                          value={draft.flatShippingFee}
                          onChange={(event) => updateDraft(market.id, "flatShippingFee", event.target.value)}
                          className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                        />
                      </div>
                      <div>
                        <label htmlFor={`free-shipping-${market.id}`} className="mb-2 block text-sm text-[var(--text-secondary)]">
                          Free shipping threshold ({market.currencyCode})
                        </label>
                        <input
                          id={`free-shipping-${market.id}`}
                          inputMode="decimal"
                          value={draft.freeShippingThreshold}
                          onChange={(event) => updateDraft(market.id, "freeShippingThreshold", event.target.value)}
                          className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end border-t border-[var(--border-soft)] pt-5">
                      <button
                        type="button"
                        onClick={() => saveShipping(market)}
                        disabled={Boolean(savingMarketId)}
                        className="rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-5 py-3 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)] disabled:opacity-50"
                      >
                        {isSaving ? "Saving…" : "Save shipping"}
                      </button>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </section>

        <ReturnWindowSettings />

        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
          <p className="text-sm font-medium text-[var(--color-espresso)]">Safety note</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Shipping and Return Window values are trusted server-backed settings. Return Window changes are audited and only affect future Shipment deliveries because each delivered Shipment stores its own snapshot.
          </p>
        </div>
      </div>
    </main>
  );
}

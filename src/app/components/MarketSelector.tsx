"use client";

import { useEffect, useState } from "react";

type Market = {
  id: string;
  slug: string;
  currency_code: string;
  country:
    | {
        slug: string;
        name_ar: string;
        name_en: string;
      }
    | {
        slug: string;
        name_ar: string;
        name_en: string;
      }[];
};

function getCountry(market: Market) {
  return Array.isArray(market.country) ? market.country[0] : market.country;
}

export default function MarketSelector() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [marketsResponse, selectionResponse] = await Promise.all([
          fetch("/api/markets", { cache: "no-store" }),
          fetch("/api/market-selection", { cache: "no-store" }),
        ]);

        if (!marketsResponse.ok || !selectionResponse.ok) {
          return;
        }

        const marketsPayload = (await marketsResponse.json()) as {
          markets?: Market[];
        };
        const selectionPayload = (await selectionResponse.json()) as {
          market?: Market | null;
        };

        if (!cancelled) {
          setMarkets(marketsPayload.markets ?? []);
          setSelectedMarketId(selectionPayload.market?.id ?? "");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = async (marketId: string) => {
    setSaving(true);

    try {
      const response = await fetch("/api/market-selection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ marketId }),
      });

      if (!response.ok) {
        return;
      }

      setSelectedMarketId(marketId);
      window.location.reload();
    } finally {
      setSaving(false);
    }
  };

  if (loading || markets.length === 0) {
    return null;
  }

  return (
    <label className="hidden items-center gap-2 text-xs text-[var(--text-secondary)] sm:flex">
      <span className="sr-only">Market</span>
      <select
        aria-label="Market"
        value={selectedMarketId}
        disabled={saving}
        onChange={(event) => handleChange(event.target.value)}
        className="max-w-36 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--color-espresso)] outline-none transition focus:border-[var(--color-copper)] disabled:opacity-60"
      >
        <option value="" disabled>
          Select market
        </option>
        {markets.map((market) => {
          const country = getCountry(market);

          return (
            <option key={market.id} value={market.id}>
              {country?.name_en ?? market.slug} · {market.currency_code}
            </option>
          );
        })}
      </select>
    </label>
  );
}

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
  const [displayMarketId, setDisplayMarketId] = useState("");
  const [suggestedMarketId, setSuggestedMarketId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [marketsResponse, selectionResponse, suggestionResponse] =
          await Promise.all([
            fetch("/api/markets", { cache: "no-store" }),
            fetch("/api/market-selection", { cache: "no-store" }),
            fetch("/api/market-suggestion", { cache: "no-store" }),
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
        const suggestionPayload = suggestionResponse.ok
          ? ((await suggestionResponse.json()) as {
              suggestion?: Market | null;
            })
          : { suggestion: null };

        if (!cancelled) {
          const confirmedMarketId = selectionPayload.market?.id ?? "";
          const suggestionMarketId = suggestionPayload.suggestion?.id ?? "";

          setMarkets(marketsPayload.markets ?? []);
          setSelectedMarketId(confirmedMarketId);
          setSuggestedMarketId(suggestionMarketId);
          setDisplayMarketId(confirmedMarketId || suggestionMarketId);
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

  const saveMarket = async (marketId: string) => {
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

  const handleChange = async (marketId: string) => {
    setDisplayMarketId(marketId);

    // A geo-detected market is only a suggestion. Do not persist it until
    // the customer confirms it. Any other manual choice is explicit.
    if (!selectedMarketId && marketId === suggestedMarketId) {
      return;
    }

    await saveMarket(marketId);
  };

  const shouldConfirmSuggestion =
    !selectedMarketId &&
    Boolean(suggestedMarketId) &&
    displayMarketId === suggestedMarketId;

  if (loading || markets.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
      <label>
        <span className="sr-only">Market</span>
        <select
          aria-label="Market"
          value={displayMarketId}
          disabled={saving}
          onChange={(event) => void handleChange(event.target.value)}
          className="max-w-28 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-2 text-xs text-[var(--color-espresso)] outline-none transition focus:border-[var(--color-copper)] disabled:opacity-60 sm:max-w-36 sm:px-3"
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

      {shouldConfirmSuggestion && (
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveMarket(displayMarketId)}
          className="rounded-full border border-[var(--color-copper)] px-2 py-2 text-[11px] font-medium text-[var(--color-copper)] transition hover:bg-[var(--color-copper)] hover:text-[var(--color-ivory)] disabled:opacity-60"
        >
          Confirm
        </button>
      )}
    </div>
  );
}

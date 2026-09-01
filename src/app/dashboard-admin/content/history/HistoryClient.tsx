"use client";

import { useCallback, useEffect, useState } from "react";

type AuditEvent = {
  id: number;
  documentKey: string;
  contentType: string | null;
  action: string;
  actorUserId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type Version = {
  id: number;
  documentKey: string;
  contentType: string;
  versionKind: string;
  sourceRevision: number;
  createdByUserId: string | null;
  createdAt: string;
};

type History = {
  documentKey: string | null;
  limit: number;
  events: AuditEvent[];
  versions: Version[];
};

const PRESETS = ["", "homepage", "campaign:main", "help:main", "contact:main", "footer:main", "brand"] as const;

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function HistoryClient() {
  const [key, setKey] = useState("");
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (documentKey = key) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (documentKey.trim()) params.set("key", documentKey.trim());
      const response = await fetch(`/api/admin/cms/history?${params.toString()}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load CMS history.");
      setHistory(body.history as History);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load CMS history.");
      setHistory(null);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => { void load(""); }, [load]);

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-6">
        <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Filter history</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Leave the key empty to see recent history across all CMS documents.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset || "all"}
              type="button"
              className="btn-secondary"
              onClick={() => { setKey(preset); void load(preset); }}
            >
              {preset || "All CMS"}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={key}
            onChange={(event) => setKey(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void load(); }}
            placeholder="blog:slug, page:slug, country:slug..."
            className="min-w-0 flex-1 rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2"
          />
          <button type="button" className="btn-primary" disabled={loading} onClick={() => void load()}>
            {loading ? "Loading…" : "Load history"}
          </button>
        </div>
        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Audit events</h2>
            <span className="text-xs text-[var(--text-muted)]">{history?.events?.length ?? 0} shown</span>
          </div>
          <div className="mt-4 space-y-3">
            {!loading && (history?.events?.length ?? 0) === 0 && <p className="text-sm text-[var(--text-muted)]">No audit events found.</p>}
            {history?.events?.map((event) => (
              <article key={event.id} className="rounded-lg border border-[var(--border-soft)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[var(--color-espresso)]">{event.action}</p>
                  <time className="text-xs text-[var(--text-muted)]">{formatDate(event.createdAt)}</time>
                </div>
                <p className="mt-2 break-all text-sm">{event.documentKey}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{event.contentType ?? "unknown type"}</p>
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-[var(--surface-muted)] p-3 text-xs whitespace-pre-wrap break-words">{JSON.stringify(event.metadata, null, 2)}</pre>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Saved versions</h2>
            <span className="text-xs text-[var(--text-muted)]">{history?.versions?.length ?? 0} shown</span>
          </div>
          <div className="mt-4 space-y-3">
            {!loading && (history?.versions?.length ?? 0) === 0 && <p className="text-sm text-[var(--text-muted)]">No saved versions found.</p>}
            {history?.versions?.map((version) => (
              <article key={version.id} className="rounded-lg border border-[var(--border-soft)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[var(--color-espresso)]">{version.versionKind} · revision {version.sourceRevision}</p>
                  <time className="text-xs text-[var(--text-muted)]">{formatDate(version.createdAt)}</time>
                </div>
                <p className="mt-2 break-all text-sm">{version.documentKey}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{version.contentType}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

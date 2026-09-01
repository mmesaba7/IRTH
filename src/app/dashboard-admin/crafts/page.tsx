"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Craft = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  icon: string | null;
  isActive: boolean;
  artisanCount: number;
  activeArtisanCount: number;
  publishedProductCount: number;
  commissionRate: string | number | null;
};

type CraftForm = {
  slug: string;
  nameAr: string;
  nameEn: string;
  icon: string;
};

const EMPTY_FORM: CraftForm = { slug: "", nameAr: "", nameEn: "", icon: "" };

export default function AdminCraftsPage() {
  const [crafts, setCrafts] = useState<Craft[]>([]);
  const [reason, setReason] = useState("");
  const [form, setForm] = useState<CraftForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/structure", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to load crafts.");
      setCrafts(Array.isArray(body?.crafts) ? body.crafts : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load crafts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(craft: Craft) {
    setEditingId(craft.id);
    setForm({ slug: craft.slug, nameAr: craft.nameAr, nameEn: craft.nameEn, icon: craft.icon ?? "" });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveCraft() {
    if (working) return;
    setWorking(editingId ?? "new");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/structure", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "craft",
          id: editingId ?? undefined,
          slug: form.slug,
          nameAr: form.nameAr,
          nameEn: form.nameEn,
          icon: form.icon || null,
          reason: reason.trim() || null,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to save craft.");
      setMessage(editingId ? "Craft updated and audited." : "Craft created and audited.");
      setReason("");
      resetForm();
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save craft.");
    } finally {
      setWorking(null);
    }
  }

  async function toggle(craft: Craft) {
    if (working) return;
    setWorking(craft.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/structure", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "craft", id: craft.id, active: !craft.isActive, reason: reason.trim() || null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to update craft.");
      setMessage(`Craft ${craft.isActive ? "deactivated" : "activated"} and recorded in audit history.`);
      setReason("");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update craft.");
    } finally {
      setWorking(null);
    }
  }

  async function remove(craft: Craft) {
    if (working) return;
    const confirmed = window.confirm(`Delete ${craft.nameEn}? This only succeeds if the craft has never been used.`);
    if (!confirmed) return;
    setWorking(craft.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/structure", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "craft", id: craft.id, reason: reason.trim() || null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to delete craft.");
      setMessage("Unused craft deleted and recorded in audit history.");
      setReason("");
      if (editingId === craft.id) resetForm();
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete craft.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-20 text-[var(--text-primary)]">
      <section className="mx-auto max-w-5xl px-6 py-10 md:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Super Admin</p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Crafts</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">Create and rename primary Crafts. Slugs stay fixed after creation. Used Crafts are deactivated instead of deleted.</p>
          </div>
          <Link href="/dashboard-admin/dashboard" className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm">← Dashboard</Link>
        </div>

        {message && <div className="mt-5 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-5 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <section className="mt-7 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-eyebrow">{editingId ? "Edit Craft" : "Add Craft"}</p>
              <h2 className="mt-2 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">Primary Craft details</h2>
            </div>
            {editingId && <button type="button" onClick={resetForm} className="text-sm text-[var(--color-copper)]">Cancel edit</button>}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm">Slug
              <input value={form.slug} disabled={Boolean(editingId)} onChange={(e) => setForm((current) => ({ ...current, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} placeholder="pottery" className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 disabled:opacity-60" />
            </label>
            <label className="text-sm">Icon (optional)
              <input value={form.icon} maxLength={32} onChange={(e) => setForm((current) => ({ ...current, icon: e.target.value }))} placeholder="🏺" className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" />
            </label>
            <label className="text-sm">الاسم بالعربي
              <input value={form.nameAr} maxLength={120} onChange={(e) => setForm((current) => ({ ...current, nameAr: e.target.value }))} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" dir="rtl" />
            </label>
            <label className="text-sm">English name
              <input value={form.nameEn} maxLength={120} onChange={(e) => setForm((current) => ({ ...current, nameEn: e.target.value }))} className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" />
            </label>
          </div>

          <label className="mt-4 block text-sm">Change reason (optional)
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="Why is this Craft being added or changed?" className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3" />
          </label>

          <button disabled={Boolean(working)} onClick={() => void saveCraft()} className="btn-primary mt-5 disabled:opacity-50">{working ? "Saving..." : editingId ? "Save changes" : "Add Craft"}</button>
        </section>

        {loading ? (
          <p className="mt-10 text-sm text-[var(--text-secondary)]">Loading…</p>
        ) : (
          <div className="mt-7 space-y-4">
            {crafts.map((craft) => (
              <article key={craft.id} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-[var(--color-espresso)]">{craft.icon ? `${craft.icon} ` : ""}{craft.nameAr} / {craft.nameEn}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">/{craft.slug} · {craft.activeArtisanCount} active artisans · {craft.publishedProductCount} published products · commission {craft.commissionRate ?? "not configured"}%</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs ${craft.isActive ? "bg-green-50 text-green-700" : "bg-[var(--surface-muted)] text-[var(--text-muted)]"}`}>{craft.isActive ? "Active" : "Inactive"}</span>
                    <button disabled={Boolean(working)} onClick={() => startEdit(craft)} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm disabled:opacity-50">Edit</button>
                    <button disabled={Boolean(working)} onClick={() => void toggle(craft)} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm disabled:opacity-50">{craft.isActive ? "Deactivate" : "Activate"}</button>
                    <button disabled={Boolean(working)} onClick={() => void remove(craft)} className="rounded-[var(--radius-md)] border border-red-200 px-4 py-2 text-sm text-red-700 disabled:opacity-50">Delete if unused</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

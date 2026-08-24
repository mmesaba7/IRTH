"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Artisan = {
  id?: string;
  name: string;
  email?: string;
  country: string;
  status: string;
  createdAt: string;
  phone?: string;
  story?: string;
};

export default function AdminArtisansPage() {
  const router = useRouter();
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [filteredArtisans, setFilteredArtisans] = useState<Artisan[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const isAuth = document.cookie.includes("irth-admin-auth=true");
    if (!isAuth) {
      router.push("/dashboard-admin/login");
      return;
    }
    loadArtisans();
  }, [router]);

  const loadArtisans = () => {
    const allArtisans: Artisan[] = JSON.parse(
      localStorage.getItem("irth-artisans") || "[]"
    );

    // لو مفيش حرفيين، نضيف بيانات تجريبية
    if (allArtisans.length === 0) {
      const defaultArtisans: Artisan[] = [
        {
          id: "artisan-1",
          name: "Ahmed Hassan",
          email: "ahmed@irth.com",
          country: "Egypt",
          status: "Active",
          createdAt: new Date().toISOString(),
        },
        {
          id: "artisan-2",
          name: "Amina Zahra",
          email: "amina@irth.com",
          country: "Morocco",
          status: "Pending Verification",
          createdAt: new Date().toISOString(),
        },
        {
          id: "artisan-3",
          name: "Omar Khalil",
          email: "omar@irth.com",
          country: "Jordan",
          status: "Active",
          createdAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem("irth-artisans", JSON.stringify(defaultArtisans));
      setArtisans(defaultArtisans);
      setFilteredArtisans(defaultArtisans);
      setLoading(false);
      return;
    }

    setArtisans(allArtisans);
    setFilteredArtisans(allArtisans);
    setLoading(false);
  };

  // فلترة الحرفيين
  useEffect(() => {
    let filtered = artisans;

    // فلترة حسب البحث
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(term) ||
          a.country.toLowerCase().includes(term) ||
          (a.email && a.email.toLowerCase().includes(term))
      );
    }

    // فلترة حسب الحالة
    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    setFilteredArtisans(filtered);
  }, [searchTerm, statusFilter, artisans]);

  const updateArtisanStatus = (artisanName: string, newStatus: string) => {
    const allArtisans: Artisan[] = JSON.parse(
      localStorage.getItem("irth-artisans") || "[]"
    );

    const updated = allArtisans.map((a) =>
      a.name === artisanName ? { ...a, status: newStatus } : a
    );

    localStorage.setItem("irth-artisans", JSON.stringify(updated));
    setArtisans(updated);
    setMessage(`✅ Status updated for ${artisanName} to ${newStatus}`);

    // اختفاء الرسالة بعد ٣ ثواني
    setTimeout(() => setMessage(""), 3000);
  };

  // الحصول على إحصائيات الحالات
  const statusCounts = artisans.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-10">
        {/* رأس الصفحة */}
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Admin Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              Artisans
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage all artisans ({artisans.length})
            </p>
          </div>
          <Link
            href="/dashboard-admin/dashboard"
            className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* رسالة التحديث */}
        {message && (
          <div className="mt-4 rounded-[var(--radius-md)] bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* شريط البحث والفلترة */}
        <div className="mt-6 flex flex-col gap-4 rounded-[var(--radius-lg)] bg-[var(--surface)] p-5 border border-[var(--border-soft)] sm:flex-row sm:items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, country, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-copper)]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                statusFilter === "all"
                  ? "bg-[var(--color-espresso)] text-[var(--color-ivory)]"
                  : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
              }`}
            >
              All ({artisans.length})
            </button>
            {Object.entries(statusCounts).map(([status, count]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                  statusFilter === status
                    ? "bg-[var(--color-espresso)] text-[var(--color-ivory)]"
                    : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
                }`}
              >
                {status} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* جدول الحرفيين */}
        {filteredArtisans.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--text-secondary)]">No artisans found</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filter"
                : "Artisans will appear here when they register"}
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <div className="min-w-full rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
              {/* رأس الجدول */}
              <div className="grid grid-cols-5 gap-4 border-b border-[var(--border-soft)] bg-[var(--surface-muted)] px-6 py-3 text-xs font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                <span>Name</span>
                <span>Country</span>
                <span>Email</span>
                <span>Status</span>
                <span className="text-center">Action</span>
              </div>

              {/* صفوف الجدول */}
              {filteredArtisans.map((artisan) => (
                <div
                  key={artisan.id || artisan.name}
                  className="grid grid-cols-5 gap-4 border-b border-[var(--border-soft)] px-6 py-4 text-sm last:border-0 hover:bg-[var(--surface-muted)]"
                >
                  <span className="font-medium text-[var(--color-espresso)]">
                    {artisan.name}
                  </span>
                  <span>{artisan.country}</span>
                  <span className="text-[var(--text-secondary)]">
                    {artisan.email || "—"}
                  </span>
                  <span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        artisan.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : artisan.status === "Pending Verification"
                          ? "bg-yellow-100 text-yellow-700"
                          : artisan.status === "Under Review"
                          ? "bg-blue-100 text-blue-700"
                          : artisan.status === "Suspended"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {artisan.status}
                    </span>
                  </span>
                  <div className="flex justify-center">
                    <select
                      value={artisan.status}
                      onChange={(e) =>
                        updateArtisanStatus(artisan.name, e.target.value)
                      }
                      className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-3 py-1.5 text-xs outline-none focus:border-[var(--color-copper)]"
                    >
                      <option value="Active">Active</option>
                      <option value="Pending Verification">Pending Verification</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Deactivated">Deactivated</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (email === "admin@irth.com" && password === "admin123") {
      document.cookie = "irth-admin-auth=true; path=/";
      router.push("/dashboard-admin/dashboard");
    } else {
      setError("❌ بيانات الدخول غير صحيحة");
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-center font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
          IRTH Admin
        </h1>
        <form onSubmit={handleLogin} className="mt-10 space-y-6">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@irth.com"
            className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] hover:bg-[var(--color-copper)]"
          >
            Login
          </button>
        </form>
      </div>
    </main>
  );
}
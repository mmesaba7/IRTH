"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";

export default function ArtisanLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // دالة تسجيل الدخول (مؤقتة بدون خادم)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // حالياً هنستخدم بيانات دخول وهمية عشان نختبر الشكل
    // (لما نربطها بقاعدة البيانات، هنستبدل السطر ده)
    if (email === "artisan@irth.com" && password === "123456") {
      localStorage.setItem("irth-artisan-auth", "true");
      router.push("/artisan/dashboard");
    } else {
      setError("❌ بيانات الدخول غير صحيحة. استخدم artisan@irth.com / 123456");
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-6 py-20">
        <div className="w-full">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Artisan Access
            </p>
            <h1 className="mt-3 font-[var(--font-display)] text-4xl font-normal text-[var(--color-espresso)]">
              مرحباً بعودتك
            </h1>
            <p className="mt-3 text-[var(--text-secondary)]">
              سجل دخولك لإدارة منتجاتك وطلباتك
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-10 space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                placeholder="artisan@irth.com"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="rounded-[var(--radius-md)] bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)]"
            >
              دخول
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
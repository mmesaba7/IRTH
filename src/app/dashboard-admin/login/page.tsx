import Link from "next/link";
import { adminLogin } from "./actions";

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-card)] md:grid-cols-[0.9fr_1.1fr]">
          <section className="hidden bg-[var(--color-espresso)] p-10 text-[var(--color-ivory)] md:flex md:flex-col md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--color-antique-gold)]">IRTH Operations</p>
              <h1 className="mt-4 font-[var(--font-display)] text-5xl leading-tight">Super Admin</h1>
              <p className="mt-5 max-w-sm text-sm leading-7 text-[var(--color-ivory)]/70">
                Secure access to marketplace operations, moderation, orders, money, and content management.
              </p>
            </div>
            <p className="text-xs text-[var(--color-ivory)]/50">Authorized IRTH operations access only.</p>
          </section>

          <section className="p-7 sm:p-10 md:p-12">
            <Link href="/" className="text-sm font-medium text-[var(--color-copper)] hover:underline">← IRTH</Link>
            <p className="mt-10 text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Admin Panel</p>
            <h2 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">Sign in</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Use the authorized Super Admin account to continue.</p>

            <form action={adminLogin} className="mt-8 space-y-5">
              <div>
                <label htmlFor="admin-email" className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">Email</label>
                <input
                  id="admin-email"
                  type="email"
                  name="email"
                  autoComplete="username"
                  required
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 outline-none transition focus:border-[var(--color-copper)]"
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">Password</label>
                <input
                  id="admin-password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 outline-none transition focus:border-[var(--color-copper)]"
                />
              </div>

              {params.error === "invalid" && (
                <div role="alert" className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  بيانات الدخول غير صحيحة.
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)] focus:outline-none focus:ring-2 focus:ring-[var(--color-copper)] focus:ring-offset-2"
              >
                Login
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

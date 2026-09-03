import Link from "next/link";
import { customerLogin } from "../actions";

type CustomerLoginPageProps = {
  searchParams: Promise<{
    error?: string;
    status?: string;
    returnTo?: string;
  }>;
};

export default async function CustomerLoginPage({
  searchParams,
}: CustomerLoginPageProps) {
  const params = await searchParams;
  const returnTo = params.returnTo === "/checkout" ? "/checkout" : null;

  return (
    <main className="min-h-screen bg-[var(--color-espresso)] px-5 py-8 text-[var(--text-primary)] sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center sm:min-h-[calc(100vh-6rem)]">
        <div className="grid w-full overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface)] shadow-[var(--shadow-elevated)] lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="relative hidden overflow-hidden bg-[var(--color-espresso)] p-10 text-[var(--color-ivory)] lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border border-[var(--color-copper)]/25" />
            <div className="absolute -bottom-24 -left-16 h-64 w-64 rotate-45 border border-[var(--color-copper)]/15" />
            <Link href="/" className="relative z-10 font-[var(--font-display)] text-3xl tracking-[0.12em]">
              IRTH
            </Link>
            <div className="relative z-10 max-w-xs">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-copper)]">Welcome back</p>
              <p className="mt-4 font-[var(--font-display)] text-4xl leading-tight">Continue your journey through craft, place, and story.</p>
            </div>
          </aside>

          <section className="px-6 py-9 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
            <div className="flex items-center justify-between gap-4 lg:hidden">
              <Link href="/" className="font-[var(--font-display)] text-2xl tracking-[0.12em] text-[var(--color-espresso)]">IRTH</Link>
              <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--color-copper)]">Back home</Link>
            </div>

            <p className="mt-10 text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)] lg:mt-0">My Account</p>
            <h1 className="mt-3 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] sm:text-5xl">Login to IRTH</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {returnTo ? "Sign in and you will return to checkout." : "Access your orders, saved crafts, and recent activity."}
            </p>

            <form action={customerLogin} className="mt-9 space-y-5">
              {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

              <label className="block text-sm font-medium text-[var(--color-espresso)]">
                Email
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3.5 outline-none transition focus:border-[var(--color-copper)] focus:ring-2 focus:ring-[var(--color-copper)]/10"
                />
              </label>

              <label className="block text-sm font-medium text-[var(--color-espresso)]">
                Password
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3.5 outline-none transition focus:border-[var(--color-copper)] focus:ring-2 focus:ring-[var(--color-copper)]/10"
                />
              </label>

              <div aria-live="polite">
                {params.error === "invalid" && (
                  <p className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-3 text-sm text-red-700">بيانات الدخول غير صحيحة</p>
                )}
                {params.error === "account" && (
                  <p className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-3 text-sm text-red-700">حدثت مشكلة في تجهيز حساب العميل</p>
                )}
                {params.status === "check-email" && (
                  <p className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--color-olive)]">راجع بريدك الإلكتروني لتأكيد الحساب ثم سجّل الدخول.</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-semibold text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)] focus:outline-none focus:ring-2 focus:ring-[var(--color-copper)] focus:ring-offset-2"
              >
                Login
              </button>
            </form>

            <p className="mt-7 border-t border-[var(--border-soft)] pt-6 text-sm text-[var(--text-secondary)]">
              New to IRTH?{" "}
              <Link href="/account/signup" className="font-medium text-[var(--color-copper)] hover:underline">Create account</Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

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
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <p className="text-center text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
          My Account
        </p>

        <h1 className="mt-3 text-center font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
          Login to IRTH
        </h1>

        {returnTo && (
          <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
            Sign in and you will return to checkout.
          </p>
        )}

        <form action={customerLogin} className="mt-10 space-y-6">
          {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3"
          />

          <input
            type="password"
            name="password"
            placeholder="••••••••"
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3"
          />

          {params.error === "invalid" && (
            <p className="text-sm text-red-600">
              بيانات الدخول غير صحيحة
            </p>
          )}

          {params.error === "account" && (
            <p className="text-sm text-red-600">
              حدثت مشكلة في تجهيز حساب العميل
            </p>
          )}

          {params.status === "check-email" && (
            <p className="text-sm text-[var(--color-olive)]">
              راجع بريدك الإلكتروني لتأكيد الحساب ثم سجّل الدخول.
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] hover:bg-[var(--color-copper)]"
          >
            Login
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          New to IRTH?{" "}
          <Link
            href="/account/signup"
            className="text-[var(--color-copper)] hover:underline"
          >
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}

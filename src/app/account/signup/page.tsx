import Link from "next/link";
import { customerSignup } from "../actions";

type CustomerSignupPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function CustomerSignupPage({
  searchParams,
}: CustomerSignupPageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <p className="text-center text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
          My Account
        </p>

        <h1 className="mt-3 text-center font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
          Create IRTH Account
        </h1>

        <form action={customerSignup} className="mt-10 space-y-6">
          <input
            type="text"
            name="name"
            placeholder="Name"
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3"
          />

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
            placeholder="Password"
            minLength={6}
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3"
          />

          {params.error && (
            <p className="text-sm text-red-600">
              لم نتمكن من إنشاء الحساب.
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] hover:bg-[var(--color-copper)]"
          >
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{" "}
          <Link
            href="/account/login"
            className="text-[var(--color-copper)] hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
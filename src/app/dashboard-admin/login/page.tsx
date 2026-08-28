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
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-center font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
          IRTH Admin
        </h1>

        <form action={adminLogin} className="mt-10 space-y-6">
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="••••••••"
            className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3"
            required
          />

          {params.error === "invalid" && (
            <p className="text-sm text-red-600">
              ❌ بيانات الدخول غير صحيحة
            </p>
          )}

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

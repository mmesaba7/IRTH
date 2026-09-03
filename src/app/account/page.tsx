"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import MobileBottomNav from "../components/MobileBottomNav";
import { createClient } from "@/lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        <div className="flex flex-col gap-6 border-b border-[var(--border-soft)] pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              My Account
            </p>

            <h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">
              Welcome to IRTH
            </h1>

            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Manage your orders and shopping activity.
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut({ scope: "local" });
              router.replace("/account/login");
              router.refresh();
            }}
            className="self-start rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-2 text-sm font-medium text-[var(--color-espresso)] transition hover:border-[var(--color-copper)] hover:text-[var(--color-copper)]"
          >
            Logout
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AccountCard
            href="/account/orders"
            title="My Orders"
            description="View, track, and review your purchases."
            action="View orders →"
          />
          <AccountCard
            href="/saved"
            title="Saved Crafts"
            description="Return to products you saved for later."
            action="View saved →"
          />
          <AccountCard
            href="/recently-viewed"
            title="Recently Viewed"
            description="Continue exploring products you recently opened."
            action="View history →"
          />
        </div>
      </section>

      <MobileBottomNav active="account" />
    </main>
  );
}

function AccountCard({
  href,
  title,
  description,
  action,
}: {
  href: string;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 transition hover:border-[var(--color-copper)]"
    >
      <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>
      <p className="mt-5 text-sm font-medium text-[var(--color-copper)]">{action}</p>
    </Link>
  );
}

"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ArtisanLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/artisan/login");
    router.refresh();
  };

  const isLoginPage = pathname === "/artisan/login";

  return (
    <>
      {!isLoginPage && (
        <div className="border-b border-[var(--border-soft)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-[var(--container-max)] items-center justify-end px-4 py-2 sm:px-6">
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      )}

      {children}
    </>
  );
}

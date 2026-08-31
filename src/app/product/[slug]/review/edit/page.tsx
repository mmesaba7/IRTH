"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Header from "../../../../components/Header";

export default function EditReviewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = String(params.slug ?? "");
  const orderItemId = searchParams.get("orderItemId");
  const guestToken = searchParams.get("guestToken");

  useEffect(() => {
    const query = new URLSearchParams();
    if (orderItemId) query.set("orderItemId", orderItemId);
    if (guestToken) query.set("guestToken", guestToken);
    router.replace(`/product/${slug}/review${query.size ? `?${query.toString()}` : ""}`);
  }, [guestToken, orderItemId, router, slug]);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Header />
      <div className="flex h-96 items-center justify-center text-[var(--text-secondary)]">
        جاري فتح التقييم الآمن...
      </div>
    </main>
  );
}

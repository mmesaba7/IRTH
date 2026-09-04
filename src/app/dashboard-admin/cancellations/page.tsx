import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CancellationReviewForm from "./CancellationReviewForm";

type CancellationRow = {
  request_id: string;
  order_id: string;
  order_number: string;
  requester_kind: string;
  reason_text: string;
  submitted_at: string;
  order_status: string;
  payment_status: string;
  currency_code: string;
  final_total: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function AdminCancellationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/dashboard-admin/login");

  const { data, error } = await supabase.rpc("get_admin_order_cancellation_requests");
  const unauthorized = error?.message?.includes("admin_required") ?? false;
  const requests = (data ?? []) as CancellationRow[];

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <section className="mx-auto max-w-4xl px-6 py-10 md:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Admin Panel</p>
            <h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">طلبات إلغاء تحتاج مراجعة</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              يظهر هنا فقط الطلب الذي بدأ تجهيزه ولم تستلمه شركة الشحن بعد. الموافقة توقف طلب COD المعلّق وتعيد المخزون المحجوز؛ بعد استلام شركة الشحن لا نستخدم Cancellation بل Return / Refusal.
            </p>
          </div>
          <Link href="/dashboard-admin/dashboard" className="w-fit rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm">← لوحة الإدارة</Link>
        </div>

        {unauthorized ? (
          <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-terracotta)] bg-[var(--surface)] p-6 text-sm text-[var(--color-terracotta)]">
            هذه الصفحة متاحة للـ Super Admin فقط.
          </div>
        ) : error ? (
          <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-terracotta)] bg-[var(--surface)] p-6 text-sm text-[var(--color-terracotta)]">
            تعذر تحميل طلبات الإلغاء الآن.
          </div>
        ) : requests.length === 0 ? (
          <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-8 text-center">
            <p className="font-medium text-[var(--color-espresso)]">لا توجد طلبات إلغاء تنتظر المراجعة.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {requests.map((request) => (
              <article key={request.request_id} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
                <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-mono text-sm font-semibold text-[var(--color-espresso)]">{request.order_number}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{formatDate(request.submitted_at)}</p>
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">الحالة الحالية: {request.order_status.replaceAll("_", " ")} · الدفع: {request.payment_status.replaceAll("_", " ")}</p>
                    <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">سبب العميل</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-espresso)]">{request.reason_text}</p>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-[var(--color-copper)]">{request.currency_code} {request.final_total}</p>
                </div>
                <CancellationReviewForm requestId={request.request_id} />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

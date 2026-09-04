import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CodCollectionForm from "./CodCollectionForm";

type AdminOrderRow = {
  order_id: string;
  order_number: string;
  order_status: string;
  payment_status: string;
  currency_code: string;
  final_total: string;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function AdminCodPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard-admin/login");
  }

  const { data, error } = await supabase.rpc("get_admin_orders");
  const unauthorized = error?.message?.includes("admin_required") ?? false;
  const orders = (data ?? []) as AdminOrderRow[];
  const pendingCod = orders.filter(
    (order) =>
      order.order_status === "delivered" && order.payment_status === "pending"
  );

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <section className="mx-auto max-w-4xl px-6 py-10 md:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Admin Panel
            </p>
            <h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)]">
              تحصيل الدفع عند الاستلام
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              في الـControlled Beta الحالية الدفع الفعلي هو COD فقط. لا يتم اعتبار المبلغ محصلًا بمجرد التسليم؛ سجّل التحصيل هنا فقط بعد تأكيد استلام IRTH للمبلغ.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard-admin/orders"
              className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm"
            >
              الطلبات والشحن
            </Link>
            <Link
              href="/dashboard-admin/payouts"
              className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-4 py-2 text-sm"
            >
              Payouts
            </Link>
          </div>
        </div>

        {unauthorized ? (
          <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-terracotta)] bg-[var(--surface)] p-6 text-sm text-[var(--color-terracotta)]">
            هذه الصفحة متاحة للـ Super Admin فقط.
          </div>
        ) : error ? (
          <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-terracotta)] bg-[var(--surface)] p-6 text-sm text-[var(--color-terracotta)]">
            تعذر تحميل الطلبات الآن. حاول تحديث الصفحة.
          </div>
        ) : pendingCod.length === 0 ? (
          <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-8 text-center">
            <p className="font-medium text-[var(--color-espresso)]">لا توجد طلبات COD مسلّمة بانتظار تسجيل التحصيل.</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              الطلب لا يظهر هنا إلا بعد أن يصبح Delivered ويظل Payment Pending.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {pendingCod.map((order) => (
              <article
                key={order.order_id}
                className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6"
              >
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Order</p>
                    <p className="mt-2 font-mono text-sm font-semibold text-[var(--color-espresso)]">
                      {order.order_number}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">{formatDate(order.created_at)}</p>
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">
                      Order: Delivered · Payment: Pending
                    </p>
                  </div>
                  <p className="text-xl font-semibold text-[var(--color-copper)]">
                    {order.currency_code} {order.final_total}
                  </p>
                </div>
                <CodCollectionForm orderId={order.order_id} />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

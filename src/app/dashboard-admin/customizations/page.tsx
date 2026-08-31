import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AdminOrderItem = {
  id: string;
  productSlug: string;
  productNameAr: string | null;
  productNameEn: string;
  quantity: number;
  customizationText: string | null;
};

type AdminArtisanGroup = {
  artisanGroupId: string;
  artisanNameAr: string | null;
  artisanNameEn: string;
  fulfillmentStatus: string;
  items: AdminOrderItem[];
};

type AdminOrderRow = {
  order_id: string;
  order_number: string;
  order_status: string;
  payment_status: string;
  created_at: string;
  artisan_groups: AdminArtisanGroup[];
};

type CustomizationRow = {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  artisanGroupId: string;
  artisanNameAr: string | null;
  artisanNameEn: string;
  fulfillmentStatus: string;
  item: AdminOrderItem;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function AdminCustomizationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/dashboard-admin/login");

  const { data, error } = await supabase.rpc("get_admin_orders");
  const unauthorized = error?.message?.includes("admin_required") ?? false;
  const orders = (data ?? []) as AdminOrderRow[];
  const requests: CustomizationRow[] = [];

  for (const order of orders) {
    for (const group of order.artisan_groups ?? []) {
      for (const item of group.items ?? []) {
        if (!item.customizationText) continue;
        requests.push({
          orderId: order.order_id,
          orderNumber: order.order_number,
          orderStatus: order.order_status,
          paymentStatus: order.payment_status,
          createdAt: order.created_at,
          artisanGroupId: group.artisanGroupId,
          artisanNameAr: group.artisanNameAr,
          artisanNameEn: group.artisanNameEn,
          fulfillmentStatus: group.fulfillmentStatus,
          item,
        });
      }
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] pb-20">
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Super Admin</p>
            <h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">Customization Requests</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">Trusted customization snapshots from placed order items. The text shown here is the historical customer request captured when the order was created.</p>
          </div>
          <Link href="/dashboard-admin/dashboard" className="w-fit rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]">← Dashboard</Link>
        </div>

        {unauthorized ? (
          <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-terracotta)] bg-[var(--surface)] p-6 text-sm text-[var(--color-terracotta)]">Super Admin access required.</div>
        ) : error ? (
          <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-terracotta)] bg-[var(--surface)] p-6 text-sm text-[var(--color-terracotta)]">Unable to load customization requests.</div>
        ) : requests.length === 0 ? (
          <div className="mt-10 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center text-sm text-[var(--text-secondary)]">No customization requests have been placed yet.</div>
        ) : (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">{requests.length} customization request{requests.length === 1 ? "" : "s"}</p>
            {requests.map((request) => (
              <article key={request.item.id} className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-[var(--color-espresso)]">{request.orderNumber}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{formatDate(request.createdAt)} · Order {request.orderStatus.replaceAll("_", " ")} · Payment {request.paymentStatus.replaceAll("_", " ")}</p>
                    <h2 className="mt-5 font-[var(--font-display)] text-xl text-[var(--color-espresso)]">{request.item.productNameEn}</h2>
                    {request.item.productNameAr && <p className="mt-1 text-sm text-[var(--text-secondary)]">{request.item.productNameAr}</p>}
                    <p className="mt-2 text-xs text-[var(--text-muted)]">Quantity: {request.item.quantity}</p>
                  </div>
                  <div className="md:text-right">
                    <p className="text-sm font-medium text-[var(--color-espresso)]">{request.artisanNameEn}</p>
                    {request.artisanNameAr && <p className="mt-1 text-sm text-[var(--text-secondary)]">{request.artisanNameAr}</p>}
                    <p className="mt-2 text-xs capitalize text-[var(--text-muted)]">Fulfillment: {request.fulfillmentStatus.replaceAll("_", " ")}</p>
                  </div>
                </div>
                <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-copper)] bg-[var(--surface-muted)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-copper)]">Customer customization snapshot</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--color-espresso)]">{request.item.customizationText}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "../../components/Header";
import { createClient } from "@/lib/supabase/server";
import FulfillmentActionForm from "./FulfillmentActionForm";

type ArtisanOrderItem = {
  id: string;
  productSlug: string;
  productNameAr: string | null;
  productNameEn: string;
  quantity: number;
  unitPrice: string;
  originalLineTotal: string;
  promotionDiscount: string;
  couponDiscount: string;
  lineTotal: string;
  customizationText: string | null;
};

type ArtisanOrderRow = {
  artisan_group_id: string;
  order_id: string;
  order_number: string;
  order_status: string;
  payment_status: string;
  fulfillment_status: string;
  currency_code: string;
  artisan_merchandise_subtotal: string;
  customer_display_name: string | null;
  customer_country_code: string | null;
  created_at: string;
  items: ArtisanOrderItem[];
};

const STATUS_LABELS: Record<string, string> = {
  received: "تم استلام الطلب",
  confirmed: "تم تأكيد الطلب",
  preparing: "قيد التجهيز",
  ready_for_courier_pickup: "جاهز للاستلام من شركة الشحن",
  picked_up_from_artisan: "تم استلامه من الحرفي",
  in_transit: "في الطريق",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  returned: "مرتجع",
  delivery_failed: "فشل التسليم",
  pending: "قيد الانتظار",
};

function statusLabel(value: string) {
  return STATUS_LABELS[value] ?? value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function hasPositiveMoney(value: string) {
  return Number(value) > 0;
}

export const dynamic = "force-dynamic";

export default async function ArtisanOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/artisan/login");
  }

  const { data, error } = await supabase.rpc("get_my_artisan_orders");
  const orders = (data ?? []) as ArtisanOrderRow[];

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] pb-20">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">Artisan Panel</p>
            <h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">الطلبات</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              هنا تظهر فقط الطلبات التي تحتوي على منتجاتك. بيانات التواصل والعنوان الكامل للعميل غير متاحة للحرفي.
            </p>
          </div>
          <Link href="/artisan/dashboard" className="w-fit rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2.5 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]">← لوحة الحرفي</Link>
        </div>

        {error ? (
          <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-terracotta)] bg-[var(--surface)] p-6">
            <p className="font-medium text-[var(--color-terracotta)]">تعذر تحميل الطلبات الآن.</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">حاول تحديث الصفحة مرة أخرى.</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-12 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--color-espresso)]">لا توجد طلبات لك حتى الآن.</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">عندما يشتري عميل منتجًا تابعًا لك سيظهر طلبك هنا تلقائيًا.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {orders.map((order) => (
              <article key={order.artisan_group_id} className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
                <div className="grid gap-5 border-b border-[var(--border-soft)] p-6 md:grid-cols-[1.3fr_1fr_1fr]">
                  <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Order</p><p className="mt-2 font-mono text-sm font-semibold text-[var(--color-espresso)]">{order.order_number}</p><p className="mt-2 text-xs text-[var(--text-muted)]">{formatDate(order.created_at)}</p></div>
                  <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Customer</p><p className="mt-2 font-medium text-[var(--color-espresso)]">{order.customer_display_name ?? "Customer"}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{order.customer_country_code ?? "—"}</p></div>
                  <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Your merchandise</p><p className="mt-2 text-xl font-medium text-[var(--color-copper)]">{order.currency_code} {order.artisan_merchandise_subtotal}</p></div>
                </div>

                <div className="grid gap-4 border-b border-[var(--border-soft)] bg-[var(--surface-muted)]/50 px-6 py-4 sm:grid-cols-3">
                  <div><p className="text-xs text-[var(--text-muted)]">Order status</p><p className="mt-1 text-sm font-medium text-[var(--color-espresso)]">{statusLabel(order.order_status)}</p></div>
                  <div><p className="text-xs text-[var(--text-muted)]">Your fulfillment status</p><p className="mt-1 text-sm font-medium text-[var(--color-espresso)]">{statusLabel(order.fulfillment_status)}</p></div>
                  <div><p className="text-xs text-[var(--text-muted)]">Payment status</p><p className="mt-1 text-sm font-medium text-[var(--color-espresso)]">{statusLabel(order.payment_status)}</p></div>
                </div>

                {(order.fulfillment_status === "received" || order.fulfillment_status === "confirmed") && (
                  <div className="border-b border-[var(--border-soft)] px-6 py-5">
                    <p className="text-sm font-medium text-[var(--color-espresso)]">جاهز لبدء تنفيذ الطلب؟</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">استخدم هذا الإجراء فقط عندما تبدأ فعليًا في تجهيز منتجات هذا الطلب.</p>
                    <div className="mt-3"><FulfillmentActionForm artisanGroupId={order.artisan_group_id} targetStatus="preparing" label="بدأت التجهيز" /></div>
                  </div>
                )}

                {order.fulfillment_status === "preparing" && (
                  <div className="border-b border-[var(--border-soft)] px-6 py-5">
                    <p className="text-sm font-medium text-[var(--color-espresso)]">هل انتهى تجهيز منتجاتك؟</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">بعد التأكيد سيصبح الطلب جاهزًا للاستلام من شركة الشحن، ولن تتمكن من إرجاعه إلى حالة التجهيز بنفسك.</p>
                    <div className="mt-3"><FulfillmentActionForm artisanGroupId={order.artisan_group_id} targetStatus="ready_for_courier_pickup" label="جاهز للاستلام" /></div>
                  </div>
                )}

                {order.fulfillment_status === "ready_for_courier_pickup" && (
                  <div className="border-b border-[var(--border-soft)] bg-[var(--surface-muted)]/40 px-6 py-5">
                    <p className="text-sm font-medium text-[var(--color-espresso)]">الطلب جاهز للاستلام من شركة الشحن.</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">حالات الاستلام والشحن التالية يتم تحديثها من خلال IRTH / شركة الشحن، وليست من لوحة الحرفي.</p>
                  </div>
                )}

                <div className="p-6">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Products to prepare</p>
                  <div className="mt-4 space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-[var(--color-espresso)]">{item.productNameEn}</p>
                            {item.productNameAr && <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.productNameAr}</p>}
                            <p className="mt-2 text-xs text-[var(--text-muted)]">Quantity: {item.quantity}</p>
                            {item.customizationText && (
                              <div className="mt-3 max-w-xl rounded-[var(--radius-md)] border border-[var(--color-copper)] bg-[var(--surface-muted)] p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-copper)]">Customization request</p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-espresso)]">{item.customizationText}</p>
                              </div>
                            )}
                          </div>
                          <div className="text-left sm:text-right"><p className="text-sm text-[var(--text-secondary)]">Unit: {order.currency_code} {item.unitPrice}</p><p className="mt-1 font-medium text-[var(--color-copper)]">Line: {order.currency_code} {item.lineTotal}</p></div>
                        </div>
                        {(hasPositiveMoney(item.promotionDiscount) || hasPositiveMoney(item.couponDiscount)) && (
                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-[var(--border-soft)] pt-3 text-xs text-[var(--text-muted)]">
                            {hasPositiveMoney(item.promotionDiscount) && <span>Promotion discount: {order.currency_code} {item.promotionDiscount}</span>}
                            {hasPositiveMoney(item.couponDiscount) && <span>Coupon discount: {order.currency_code} {item.couponDiscount}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

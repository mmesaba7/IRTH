import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrderConfirmForm from "./OrderConfirmForm";
import ShipmentActionForm from "./ShipmentActionForm";

type AdminOrderItem = {
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
  commissionRatePercent: string;
};

type AdminShipment = {
  id: string;
  status: string;
  courierCode: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
};

type AdminArtisanGroup = {
  artisanGroupId: string;
  artisanId: string;
  artisanNameAr: string | null;
  artisanNameEn: string;
  fulfillmentStatus: string;
  merchandiseSubtotal: string;
  shipment: AdminShipment | null;
  items: AdminOrderItem[];
};

type AdminOrderRow = {
  order_id: string;
  order_number: string;
  order_status: string;
  payment_status: string;
  currency_code: string;
  subtotal_before_promotions: string;
  promotion_discount_total: string;
  coupon_discount_total: string;
  merchandise_subtotal: string;
  shipping_fee: string;
  final_total: string;
  customer_recipient_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_country_code: string | null;
  customer_administrative_area: string | null;
  customer_city: string | null;
  customer_address_line1: string | null;
  customer_delivery_notes: string | null;
  created_at: string;
  artisan_groups: AdminArtisanGroup[];
};

const STATUS_LABELS: Record<string, string> = {
  received: "تم استلام الطلب",
  confirmed: "تم تأكيد الطلب",
  preparing: "قيد التجهيز",
  ready_for_courier_pickup: "جاهز للاستلام من شركة الشحن",
  picked_up_from_artisan: "تم الاستلام من الحرفي",
  in_transit: "في الطريق",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  returned: "مرتجع",
  delivery_failed: "فشل التسليم",
  pending: "قيد الانتظار",
  paid: "مدفوع",
  failed: "فشل الدفع",
  refunded: "تم رد المبلغ",
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

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard-admin/login");
  }

  const { data, error } = await supabase.rpc("get_admin_orders");
  const orders = (data ?? []) as AdminOrderRow[];
  const unauthorized = error?.message?.includes("admin_required") ?? false;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] pb-20">
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-10 md:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Admin Panel
            </p>
            <h1 className="mt-2 font-[var(--font-display)] text-4xl text-[var(--color-espresso)] md:text-5xl">
              الطلبات والشحن
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              إدارة الطلب الموحد، تأكيده، ومتابعة كل Shipment بقواعد انتقال آمنة ومسجلة في الـ Audit History.
            </p>
          </div>

          <Link
            href="/dashboard-admin/dashboard"
            className="w-fit rounded-[var(--radius-md)] border border-[var(--border-soft)] px-5 py-2.5 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
          >
            ← لوحة الإدارة
          </Link>
        </div>

        {unauthorized ? (
          <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-terracotta)] bg-[var(--surface)] p-6">
            <p className="font-medium text-[var(--color-terracotta)]">غير مصرح لك بعرض طلبات الإدارة.</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              الصفحة والبيانات متاحة لحساب Super Admin فقط.
            </p>
          </div>
        ) : error ? (
          <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-terracotta)] bg-[var(--surface)] p-6">
            <p className="font-medium text-[var(--color-terracotta)]">تعذر تحميل الطلبات الآن.</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">حاول تحديث الصفحة مرة أخرى.</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-12 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-10 text-center">
            <p className="text-lg text-[var(--color-espresso)]">لا توجد طلبات حتى الآن.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <p className="text-sm text-[var(--text-secondary)]">إجمالي الطلبات: {orders.length}</p>

            {orders.map((order) => (
              <article
                key={order.order_id}
                className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]"
              >
                <div className="grid gap-5 border-b border-[var(--border-soft)] p-6 md:grid-cols-[1.4fr_1fr_1fr]">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Order</p>
                    <p className="mt-2 font-mono text-sm font-semibold text-[var(--color-espresso)]">{order.order_number}</p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">{formatDate(order.created_at)}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Status</p>
                    <p className="mt-2 text-sm font-medium text-[var(--color-espresso)]">{statusLabel(order.order_status)}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Payment: {statusLabel(order.payment_status)}</p>
                    {order.order_status === "received" && (
                      <OrderConfirmForm orderId={order.order_id} />
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Final total</p>
                    <p className="mt-2 text-xl font-medium text-[var(--color-copper)]">
                      {order.currency_code} {order.final_total}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 border-b border-[var(--border-soft)] bg-[var(--surface-muted)]/40 p-6 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Customer & delivery</p>
                    <div className="mt-3 space-y-1.5 text-sm text-[var(--text-secondary)]">
                      <p><span className="font-medium text-[var(--color-espresso)]">Name:</span> {order.customer_recipient_name ?? "—"}</p>
                      <p><span className="font-medium text-[var(--color-espresso)]">Email:</span> {order.customer_email ?? "—"}</p>
                      <p><span className="font-medium text-[var(--color-espresso)]">Phone:</span> {order.customer_phone ?? "—"}</p>
                      <p>
                        <span className="font-medium text-[var(--color-espresso)]">Address:</span>{" "}
                        {[order.customer_address_line1, order.customer_city, order.customer_administrative_area, order.customer_country_code]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                      {order.customer_delivery_notes && (
                        <p><span className="font-medium text-[var(--color-espresso)]">Delivery notes:</span> {order.customer_delivery_notes}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Money snapshot</p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-4"><span>Original merchandise</span><span>{order.currency_code} {order.subtotal_before_promotions}</span></div>
                      {hasPositiveMoney(order.promotion_discount_total) && (
                        <div className="flex justify-between gap-4"><span>Promotion discount</span><span>- {order.currency_code} {order.promotion_discount_total}</span></div>
                      )}
                      {hasPositiveMoney(order.coupon_discount_total) && (
                        <div className="flex justify-between gap-4"><span>Coupon discount</span><span>- {order.currency_code} {order.coupon_discount_total}</span></div>
                      )}
                      <div className="flex justify-between gap-4"><span>Merchandise subtotal</span><span>{order.currency_code} {order.merchandise_subtotal}</span></div>
                      <div className="flex justify-between gap-4"><span>Shipping</span><span>{order.currency_code} {order.shipping_fee}</span></div>
                      <div className="flex justify-between gap-4 border-t border-[var(--border-soft)] pt-2 font-medium text-[var(--color-espresso)]">
                        <span>Final total</span><span>{order.currency_code} {order.final_total}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Artisan groups & shipments</p>
                  <div className="mt-4 space-y-4">
                    {order.artisan_groups.map((group) => (
                      <details
                        key={group.artisanGroupId}
                        className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)]"
                        open
                      >
                        <summary className="cursor-pointer list-none p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-medium text-[var(--color-espresso)]">{group.artisanNameEn}</p>
                              {group.artisanNameAr && <p className="mt-1 text-sm text-[var(--text-secondary)]">{group.artisanNameAr}</p>}
                            </div>
                            <div className="text-sm sm:text-right">
                              <p className="font-medium text-[var(--color-espresso)]">{statusLabel(group.fulfillmentStatus)}</p>
                              <p className="mt-1 text-[var(--color-copper)]">{order.currency_code} {group.merchandiseSubtotal}</p>
                            </div>
                          </div>
                        </summary>

                        <div className="border-t border-[var(--border-soft)] p-4">
                          <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">Shipment</p>
                            {group.shipment ? (
                              <div className="mt-3 space-y-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-[var(--color-espresso)]">
                                      {statusLabel(group.shipment.status)}
                                    </p>
                                    {group.shipment.trackingNumber && (
                                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                                        Tracking: {group.shipment.trackingNumber}
                                      </p>
                                    )}
                                  </div>

                                  {order.order_status === "received" ? (
                                    <p className="text-xs text-[var(--text-secondary)]">
                                      يجب تأكيد الطلب قبل بدء إجراءات الشحن.
                                    </p>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      {group.shipment.status === "pending" && (
                                        <ShipmentActionForm
                                          shipmentId={group.shipment.id}
                                          targetStatus="picked_up_from_artisan"
                                          label="تم الاستلام من الحرفي"
                                        />
                                      )}
                                      {group.shipment.status === "picked_up_from_artisan" && (
                                        <ShipmentActionForm
                                          shipmentId={group.shipment.id}
                                          targetStatus="in_transit"
                                          label="الشحنة في الطريق"
                                        />
                                      )}
                                      {group.shipment.status === "in_transit" && (
                                        <>
                                          <ShipmentActionForm
                                            shipmentId={group.shipment.id}
                                            targetStatus="delivered"
                                            label="تم التسليم"
                                          />
                                          <ShipmentActionForm
                                            shipmentId={group.shipment.id}
                                            targetStatus="delivery_failed"
                                            label="فشل التسليم"
                                            variant="danger"
                                          />
                                        </>
                                      )}
                                      {group.shipment.status === "delivered" && (
                                        <p className="text-xs font-medium text-[var(--text-secondary)]">اكتملت الشحنة.</p>
                                      )}
                                      {group.shipment.status === "delivery_failed" && (
                                        <p className="text-xs font-medium text-[var(--color-terracotta)]">
                                          الشحنة تحتاج معالجة استثنائية لاحقًا ضمن Workflow المرتجعات/فشل التسليم.
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                                سيتم إنشاء Shipment تلقائيًا عندما تصبح مجموعة الحرفي جاهزة للاستلام.
                              </p>
                            )}
                          </div>

                          <div className="mt-4 space-y-3">
                            {group.items.map((item) => (
                              <div key={item.id} className="rounded-[var(--radius-md)] bg-[var(--surface)] p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className="font-medium text-[var(--color-espresso)]">{item.productNameEn}</p>
                                    {item.productNameAr && <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.productNameAr}</p>}
                                    <p className="mt-2 text-xs text-[var(--text-muted)]">Quantity: {item.quantity}</p>
                                    <p className="mt-1 text-xs text-[var(--text-muted)]">Commission snapshot: {item.commissionRatePercent}%</p>
                                  </div>
                                  <div className="text-sm sm:text-right">
                                    <p>Unit: {order.currency_code} {item.unitPrice}</p>
                                    <p className="mt-1 font-medium text-[var(--color-copper)]">Line: {order.currency_code} {item.lineTotal}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
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

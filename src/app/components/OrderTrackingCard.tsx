import Link from "next/link";
import {
  ORDER_STAGE_SEQUENCE,
  exactStageTimestamp,
  highestReachedStageIndex,
  orderStatusLabel,
  type CustomerOrderTracking,
} from "@/lib/customerOrderTracking";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(value));
}

function isPositiveMoney(value: string) {
  return Number(value) > 0;
}

function safeTrackingUrl(value: string | null) {
  return value?.startsWith("https://") ? value : null;
}

function reviewStatusLabel(value: string | null) {
  if (!value) return null;
  return {
    pending_review: "Pending IRTH review",
    published: "Published",
    rejected: "Not approved",
    hidden: "Hidden by IRTH",
  }[value] ?? value.replaceAll("_", " ");
}

function reviewHref(slug: string, orderItemId: string, guestToken?: string) {
  const query = new URLSearchParams({ orderItemId });
  const base = `/product/${slug}/review?${query.toString()}`;
  return guestToken ? `${base}#access=${encodeURIComponent(guestToken)}` : base;
}

export default function OrderTrackingCard({
  order,
  defaultOpen = false,
  guestToken,
}: {
  order: CustomerOrderTracking;
  defaultOpen?: boolean;
  guestToken?: string;
}) {
  const reachedStageIndex = highestReachedStageIndex(order);
  const exceptionalStatus = ["cancelled", "returned", "delivery_failed"].includes(order.status);
  const hasDeliveredItem = order.items.some((item) => Boolean(item.deliveredAt));

  return (
    <details open={defaultOpen} className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
      <summary className="cursor-pointer list-none px-6 py-5 transition hover:bg-[var(--surface-muted)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-sm font-semibold text-[var(--color-espresso)]">{order.orderNumber}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{formatDate(order.createdAt)} · {order.items.length} {order.items.length === 1 ? "product" : "products"}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm font-medium text-[var(--color-olive)]">{orderStatusLabel(order.status)}</p>
            <p className="mt-1 font-medium text-[var(--color-copper)]">{order.currencyCode} {order.finalTotal}</p>
          </div>
        </div>
      </summary>

      <div className="border-t border-[var(--border-soft)] px-6 py-6">
        {exceptionalStatus && (
          <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
            <p className="text-sm font-medium text-[var(--color-terracotta)]">{orderStatusLabel(order.status)}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">This order is in an exceptional state. IRTH support will handle the next operational step.</p>
          </div>
        )}

        <section>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Order timeline</p>
          <div className="mt-4 space-y-3">
            {ORDER_STAGE_SEQUENCE.map((status, index) => {
              const reached = index <= reachedStageIndex;
              const exactTimestamp = exactStageTimestamp(order, status);
              return (
                <div key={status} className="flex gap-3">
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${reached ? "border-[var(--color-olive)] text-[var(--color-olive)]" : "border-[var(--border-soft)] text-[var(--text-muted)]"}`} aria-hidden="true">{reached ? "✓" : "·"}</div>
                  <div className="min-w-0 pb-2">
                    <p className={`text-sm font-medium ${reached ? "text-[var(--color-espresso)]" : "text-[var(--text-muted)]"}`}>{orderStatusLabel(status)}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{exactTimestamp ? formatDate(exactTimestamp) : reached ? "Completed" : "Pending"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-7 border-t border-[var(--border-soft)] pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Products</p>
            {!guestToken && hasDeliveredItem && (
              <Link href={`/account/returns/${order.orderId}`} className="text-sm font-medium text-[var(--color-copper)] hover:underline">
                Request / view return →
              </Link>
            )}
          </div>
          <div className="mt-4 space-y-4">
            {order.items.map((item) => (
              <div key={item.orderItemId} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] p-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-[var(--color-espresso)]">{item.nameEn}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Quantity: {item.quantity}</p>
                    {item.customizationText && (
                      <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
                        <p className="text-xs font-medium text-[var(--text-muted)]">Customization request</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--color-espresso)]">{item.customizationText}</p>
                      </div>
                    )}
                  </div>
                  <p className="shrink-0 text-[var(--color-copper)]">{order.currencyCode} {item.lineTotal}</p>
                </div>

                <div className="mt-3 border-t border-[var(--border-soft)] pt-3">
                  {!item.deliveredAt ? (
                    <p className="text-xs text-[var(--text-muted)]">Review becomes available after this Artisan shipment is delivered.</p>
                  ) : !item.reviewId ? (
                    <Link href={reviewHref(item.slug, item.orderItemId, guestToken)} referrerPolicy="no-referrer" className="text-sm font-medium text-[var(--color-copper)] hover:underline">
                      Review verified purchase →
                    </Link>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-[var(--text-secondary)]">Review: {reviewStatusLabel(item.reviewStatus)}</p>
                      {item.reviewEditCount === 0 && (
                        <Link href={reviewHref(item.slug, item.orderItemId, guestToken)} referrerPolicy="no-referrer" className="text-sm font-medium text-[var(--color-copper)] hover:underline">
                          Edit review once →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-7 border-t border-[var(--border-soft)] pt-6">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Order total</p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><span className="text-[var(--text-secondary)]">Merchandise</span><span>{order.currencyCode} {order.subtotalBeforePromotions}</span></div>
            {isPositiveMoney(order.promotionDiscountTotal) && <div className="flex justify-between gap-4 text-[var(--color-olive)]"><span>Promotions</span><span>− {order.currencyCode} {order.promotionDiscountTotal}</span></div>}
            {isPositiveMoney(order.couponDiscountTotal) && <div className="flex justify-between gap-4 text-[var(--color-olive)]"><span>Coupon{order.couponCode ? ` (${order.couponCode})` : ""}</span><span>− {order.currencyCode} {order.couponDiscountTotal}</span></div>}
            <div className="flex justify-between gap-4"><span className="text-[var(--text-secondary)]">Merchandise subtotal</span><span>{order.currencyCode} {order.merchandiseSubtotal}</span></div>
            <div className="flex justify-between gap-4"><span className="text-[var(--text-secondary)]">Shipping</span><span>{order.currencyCode} {order.shippingFee}</span></div>
            <div className="flex justify-between gap-4 border-t border-[var(--border-soft)] pt-3 font-medium text-[var(--color-espresso)]"><span>Final total</span><span>{order.currencyCode} {order.finalTotal}</span></div>
            <div className="flex justify-between gap-4 pt-1"><span className="text-[var(--text-secondary)]">Payment status</span><span>{orderStatusLabel(order.paymentStatus)}</span></div>
          </div>
        </section>

        <section className="mt-7 border-t border-[var(--border-soft)] pt-6">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Shipping & tracking</p>
          {order.shipments.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">Tracking will appear here once a shipment is created.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {order.shipments.map((shipment, index) => {
                const trackingUrl = safeTrackingUrl(shipment.trackingUrl);
                return (
                  <div key={`${shipment.createdAt}-${index}`} className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-espresso)]">Shipment {index + 1}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{orderStatusLabel(shipment.status)}</p>
                      </div>
                      {shipment.courierCode && <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">{shipment.courierCode.replaceAll("_", " ")}</p>}
                    </div>
                    {shipment.deliveredAt && shipment.returnWindowEndsAt && (
                      <p className="mt-3 text-xs text-[var(--text-secondary)]">Return window: {shipment.returnWindowDays} days · ends {formatDate(shipment.returnWindowEndsAt)}</p>
                    )}
                    {shipment.trackingNumber && <p className="mt-3 break-all font-mono text-sm text-[var(--color-espresso)]">{shipment.trackingNumber}</p>}
                    {trackingUrl && <Link href={trackingUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="mt-3 inline-block text-sm font-medium text-[var(--color-copper)] hover:underline">Open courier tracking →</Link>}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </details>
  );
}

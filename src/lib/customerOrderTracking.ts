export type CustomerOrderItem = {
  orderItemId: string;
  slug: string;
  nameAr: string | null;
  nameEn: string;
  quantity: number;
  unitPrice: string;
  originalLineTotal: string;
  promotionDiscount: string;
  couponDiscount: string;
  lineTotal: string;
  customizationText: string | null;
  deliveredAt: string | null;
  reviewId: string | null;
  reviewStatus: string | null;
  reviewEditCount: number;
};

export type CustomerOrderTimelineEvent = {
  status: string;
  createdAt: string;
};

export type CustomerShipmentTracking = {
  status: string;
  courierCode: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  returnWindowDays: number | null;
  returnWindowEndsAt: string | null;
  createdAt: string;
};

export type CustomerOrderTracking = {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  currencyCode: string;
  subtotalBeforePromotions: string;
  promotionDiscountTotal: string;
  couponDiscountTotal: string;
  merchandiseSubtotal: string;
  shippingFee: string;
  finalTotal: string;
  couponCode: string | null;
  createdAt: string;
  items: CustomerOrderItem[];
  timeline: CustomerOrderTimelineEvent[];
  shipments: CustomerShipmentTracking[];
};

export const ORDER_STAGE_SEQUENCE = [
  "received",
  "confirmed",
  "preparing",
  "ready_for_courier_pickup",
  "picked_up_from_artisan",
  "in_transit",
  "delivered",
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  received: "Order received",
  confirmed: "Order confirmed",
  preparing: "Preparing",
  ready_for_courier_pickup: "Ready for courier pickup",
  picked_up_from_artisan: "Picked up from artisan",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  delivery_failed: "Delivery failed",
  pending: "Pending",
  paid: "Paid",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
};

export function orderStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

export function highestReachedStageIndex(order: CustomerOrderTracking) {
  const indexes = [order.status, ...order.timeline.map((event) => event.status)]
    .map((status) =>
      ORDER_STAGE_SEQUENCE.indexOf(status as (typeof ORDER_STAGE_SEQUENCE)[number])
    )
    .filter((index) => index >= 0);

  return indexes.length > 0 ? Math.max(...indexes) : -1;
}

export function exactStageTimestamp(order: CustomerOrderTracking, status: string) {
  return order.timeline.find((event) => event.status === status)?.createdAt ?? null;
}

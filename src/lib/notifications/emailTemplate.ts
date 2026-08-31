import "server-only";

type Locale = "ar" | "en" | "auto";

type Copy = {
  arTitle: string;
  enTitle: string;
  arBody: string;
  enBody: string;
};

export type NotificationEmailContent = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getText(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function copyFor(eventKey: string, payload: Record<string, unknown>): Copy {
  const orderNumber = getText(payload, "orderNumber");
  const orderSuffixAr = orderNumber ? ` ${orderNumber}` : "";
  const orderSuffixEn = orderNumber ? ` ${orderNumber}` : "";

  switch (eventKey) {
    case "order_created":
      return {
        arTitle: "تم استلام طلبك",
        enTitle: "Order received",
        arBody: `استلمنا طلبك${orderSuffixAr} بنجاح.`,
        enBody: `We received your order${orderSuffixEn} successfully.`,
      };
    case "order_confirmed":
      return {
        arTitle: "تم تأكيد طلبك",
        enTitle: "Order confirmed",
        arBody: `تم تأكيد طلبك${orderSuffixAr}.`,
        enBody: `Your order${orderSuffixEn} has been confirmed.`,
      };
    case "preparing":
      return {
        arTitle: "بدأ تجهيز طلبك",
        enTitle: "Order preparation started",
        arBody: `بدأ تجهيز طلبك${orderSuffixAr}.`,
        enBody: `Preparation has started for your order${orderSuffixEn}.`,
      };
    case "ready_for_courier_pickup":
      return {
        arTitle: "طلبك جاهز لاستلام شركة الشحن",
        enTitle: "Ready for courier pickup",
        arBody: `طلبك${orderSuffixAr} جاهز لاستلام شركة الشحن.`,
        enBody: `Your order${orderSuffixEn} is ready for courier pickup.`,
      };
    case "picked_up_from_artisan":
      return {
        arTitle: "تم استلام طلبك من الحرفي",
        enTitle: "Picked up from artisan",
        arBody: `تم استلام طلبك${orderSuffixAr} من الحرفي.`,
        enBody: `Your order${orderSuffixEn} was picked up from the artisan.`,
      };
    case "in_transit":
      return {
        arTitle: "طلبك في الطريق",
        enTitle: "Order in transit",
        arBody: `طلبك${orderSuffixAr} في الطريق إليك.`,
        enBody: `Your order${orderSuffixEn} is in transit.`,
      };
    case "delivered":
      return {
        arTitle: "تم تسليم طلبك",
        enTitle: "Order delivered",
        arBody: `تم تسليم طلبك${orderSuffixAr}.`,
        enBody: `Your order${orderSuffixEn} has been delivered.`,
      };
    case "delivery_failed":
      return {
        arTitle: "تعذر تسليم طلبك",
        enTitle: "Delivery attempt failed",
        arBody: `تعذر تسليم طلبك${orderSuffixAr}. سيتابع فريق IRTH الحالة.`,
        enBody: `Delivery for order${orderSuffixEn} was unsuccessful. IRTH will follow up.`,
      };
    case "cancelled":
      return {
        arTitle: "تم إلغاء طلبك",
        enTitle: "Order cancelled",
        arBody: `تم إلغاء طلبك${orderSuffixAr}.`,
        enBody: `Your order${orderSuffixEn} was cancelled.`,
      };
    case "returned":
      return {
        arTitle: "تم تحديث طلبك كمرتجع",
        enTitle: "Order returned",
        arBody: `تم تحديث طلبك${orderSuffixAr} كمرتجع.`,
        enBody: `Your order${orderSuffixEn} was marked as returned.`,
      };
    case "tracking_updated":
      return {
        arTitle: "تم تحديث بيانات التتبع",
        enTitle: "Tracking updated",
        arBody: `تم تحديث بيانات تتبع طلبك${orderSuffixAr}.`,
        enBody: `Tracking details for your order${orderSuffixEn} were updated.`,
      };
    case "new_order":
      return {
        arTitle: "لديك طلب جديد",
        enTitle: "You have a new order",
        arBody: `يوجد طلب جديد${orderSuffixAr} يحتوي على منتجاتك. راجع تفاصيل الطلب في لوحة الحرفي.`,
        enBody: `A new order${orderSuffixEn} includes your products. Review it in the artisan dashboard.`,
      };
    case "product_approved":
      return {
        arTitle: "تمت الموافقة على منتجك",
        enTitle: "Product approved",
        arBody: "تمت الموافقة على منتجك من IRTH.",
        enBody: "Your product has been approved by IRTH.",
      };
    case "product_rejected":
      return {
        arTitle: "يحتاج منتجك إلى مراجعة",
        enTitle: "Product needs changes",
        arBody: "لم تتم الموافقة على المنتج في المراجعة الحالية. راجع لوحة الحرفي لمعرفة الحالة والتعديلات المطلوبة.",
        enBody: "The product was not approved in the current review. Check the artisan dashboard for its status and required changes.",
      };
    default:
      return {
        arTitle: "تحديث مهم من IRTH",
        enTitle: "Important IRTH update",
        arBody: "لديك تحديث مهم جديد على IRTH.",
        enBody: "You have a new important update from IRTH.",
      };
  }
}

export function renderNotificationEmail(input: {
  eventKey: string;
  locale: Locale;
  payload: Record<string, unknown>;
  link?: string | null;
}): NotificationEmailContent {
  const copy = copyFor(input.eventKey, input.payload);
  const safeLink = input.link ? escapeHtml(input.link) : null;

  let subject: string;
  let text: string;
  let bodyHtml: string;

  if (input.locale === "ar") {
    subject = `IRTH — ${copy.arTitle}`;
    text = copy.arBody;
    bodyHtml = `<div dir="rtl" lang="ar"><h1>${escapeHtml(copy.arTitle)}</h1><p>${escapeHtml(copy.arBody)}</p></div>`;
  } else if (input.locale === "en") {
    subject = `IRTH — ${copy.enTitle}`;
    text = copy.enBody;
    bodyHtml = `<div dir="ltr" lang="en"><h1>${escapeHtml(copy.enTitle)}</h1><p>${escapeHtml(copy.enBody)}</p></div>`;
  } else {
    subject = `IRTH — ${copy.arTitle} | ${copy.enTitle}`;
    text = `${copy.arBody}\n\n${copy.enBody}`;
    bodyHtml = `<div dir="rtl" lang="ar"><h1>${escapeHtml(copy.arTitle)}</h1><p>${escapeHtml(copy.arBody)}</p></div><hr /><div dir="ltr" lang="en"><h2>${escapeHtml(copy.enTitle)}</h2><p>${escapeHtml(copy.enBody)}</p></div>`;
  }

  const linkText = input.locale === "en" ? "Open IRTH" : input.locale === "ar" ? "افتح IRTH" : "افتح IRTH / Open IRTH";
  const linkHtml = safeLink
    ? `<p style="margin-top:24px"><a href="${safeLink}" rel="noreferrer">${escapeHtml(linkText)}</a></p>`
    : "";
  const textWithLink = input.link ? `${text}\n\n${linkText}: ${input.link}` : text;

  return {
    subject,
    text: textWithLink,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#2b2118"><main style="max-width:640px;margin:0 auto;padding:24px"><p style="font-weight:700;letter-spacing:.08em">IRTH</p>${bodyHtml}${linkHtml}</main></body></html>`,
  };
}

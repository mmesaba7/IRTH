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
  const batchNumber = getText(payload, "batchNumber");
  const amount = getText(payload, "amount");
  const currencyCode = getText(payload, "currencyCode");
  const orderSuffixAr = orderNumber ? ` ${orderNumber}` : "";
  const orderSuffixEn = orderNumber ? ` ${orderNumber}` : "";
  const batchSuffixAr = batchNumber ? ` ${batchNumber}` : "";
  const batchSuffixEn = batchNumber ? ` ${batchNumber}` : "";
  const amountSuffixAr = amount
    ? ` بقيمة ${amount}${currencyCode ? ` ${currencyCode}` : ""}`
    : "";
  const amountSuffixEn = amount
    ? ` for ${amount}${currencyCode ? ` ${currencyCode}` : ""}`
    : "";

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
        arBody:
          "لم تتم الموافقة على المنتج في المراجعة الحالية. راجع لوحة الحرفي لمعرفة الحالة والتعديلات المطلوبة.",
        enBody:
          "The product was not approved in the current review. Check the artisan dashboard for its status and required changes.",
      };
    case "payment_confirmed_artisan":
      return {
        arTitle: "تم تأكيد دفع الطلب",
        enTitle: "Order payment confirmed",
        arBody: `تم تأكيد الدفع للطلب${orderSuffixAr}. يمكنك متابعة حالة الطلب من لوحة الحرفي.`,
        enBody: `Payment for order${orderSuffixEn} has been confirmed. You can follow the order from the artisan dashboard.`,
      };
    case "return_requested":
      return {
        arTitle: "تم استلام طلب الإرجاع",
        enTitle: "Return request received",
        arBody: `استلمنا طلب الإرجاع الخاص بطلبك${orderSuffixAr}. سيقوم فريق IRTH بمراجعته وإدارة الخطوات التالية.`,
        enBody: `We received your return request for order${orderSuffixEn}. IRTH will review it and manage the next steps.`,
      };
    case "return_requested_artisan":
      return {
        arTitle: "يوجد طلب إرجاع",
        enTitle: "A return was requested",
        arBody: `تم تقديم طلب إرجاع على منتج من الطلب${orderSuffixAr}. IRTH ستدير المراجعة والتواصل مع العميل.`,
        enBody: `A return was requested for an item in order${orderSuffixEn}. IRTH will manage the review and customer communication.`,
      };
    case "return_approved":
      return {
        arTitle: "تم قبول طلب الإرجاع",
        enTitle: "Return request approved",
        arBody: `تم قبول طلب الإرجاع الخاص بطلبك${orderSuffixAr}. سيتابع فريق IRTH خطوات الإرجاع.`,
        enBody: `Your return request for order${orderSuffixEn} was approved. IRTH will coordinate the return steps.`,
      };
    case "return_rejected":
      return {
        arTitle: "لم تتم الموافقة على طلب الإرجاع",
        enTitle: "Return request not approved",
        arBody: `لم تتم الموافقة على طلب الإرجاع الخاص بطلبك${orderSuffixAr} في المراجعة الحالية.`,
        enBody: `Your return request for order${orderSuffixEn} was not approved in the current review.`,
      };
    case "refund_processing":
      return {
        arTitle: "جاري تجهيز الاسترداد",
        enTitle: "Refund is being prepared",
        arBody: `بدأ فريق IRTH تجهيز الاسترداد الخاص بطلبك${orderSuffixAr}.`,
        enBody: `IRTH has started preparing the refund for order${orderSuffixEn}.`,
      };
    case "refund_succeeded":
      return {
        arTitle: "تم تسجيل الاسترداد",
        enTitle: "Refund completed",
        arBody: `تم تسجيل استرداد طلبك${orderSuffixAr} بنجاح${amountSuffixAr}.`,
        enBody: `The refund for order${orderSuffixEn} was completed successfully${amountSuffixEn}.`,
      };
    case "refund_adjusted_artisan":
      return {
        arTitle: "تم تحديث المستحقات بعد الاسترداد",
        enTitle: "Earnings adjusted after refund",
        arBody: `تم تحديث مستحقات الطلب${orderSuffixAr} بعد تنفيذ الاسترداد. راجع صفحة المستحقات لمعرفة الرصيد الحالي.`,
        enBody: `Your earnings for order${orderSuffixEn} were adjusted after the refund. Check the payouts page for the current balance.`,
      };
    case "payout_account_approved":
      return {
        arTitle: "تم اعتماد بيانات الصرف",
        enTitle: "Payout details approved",
        arBody: "تمت مراجعة واعتماد بيانات الصرف الخاصة بك. لا تحتوي هذه الرسالة على أي بيانات بنكية حساسة.",
        enBody: "Your payout details were reviewed and approved. This email does not contain sensitive bank information.",
      };
    case "payout_account_rejected":
      return {
        arTitle: "بيانات الصرف تحتاج تعديل",
        enTitle: "Payout details need changes",
        arBody: "لم يتم اعتماد بيانات الصرف في المراجعة الحالية. راجع حالتها داخل IRTH وأرسل بيانات جديدة عند الحاجة.",
        enBody: "Your payout details were not approved in the current review. Check their status in IRTH and submit new details if needed.",
      };
    case "payout_batch_paid":
      return {
        arTitle: "تم تسجيل عملية الصرف",
        enTitle: "Payout recorded",
        arBody: `تم تسجيل دفعة الصرف${batchSuffixAr} كمدفوعة${amountSuffixAr}. راجع سجل المستحقات داخل IRTH للتفاصيل.`,
        enBody: `Payout batch${batchSuffixEn} was recorded as paid${amountSuffixEn}. Check your payout history in IRTH for details.`,
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

  const linkText =
    input.locale === "en"
      ? "Open IRTH"
      : input.locale === "ar"
      ? "افتح IRTH"
      : "افتح IRTH / Open IRTH";
  const linkHtml = safeLink
    ? `<p style="margin-top:24px"><a href="${safeLink}" rel="noreferrer">${escapeHtml(linkText)}</a></p>`
    : "";
  const textWithLink = input.link
    ? `${text}\n\n${linkText}: ${input.link}`
    : text;

  return {
    subject,
    text: textWithLink,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#2b2118"><main style="max-width:640px;margin:0 auto;padding:24px"><p style="font-weight:700;letter-spacing:.08em">IRTH</p>${bodyHtml}${linkHtml}</main></body></html>`,
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AdminOrderActionState = {
  ok: boolean;
  message: string | null;
};

const SHIPMENT_TARGETS = new Set([
  "picked_up_from_artisan",
  "in_transit",
  "delivered",
  "delivery_failed",
]);

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, authenticated: false } as const;
  }

  return { supabase, authenticated: true } as const;
}

export async function confirmAdminOrder(
  _previousState: AdminOrderActionState,
  formData: FormData
): Promise<AdminOrderActionState> {
  const orderId = String(formData.get("orderId") ?? "").trim();

  if (!orderId) {
    return { ok: false, message: "طلب التأكيد غير صالح." };
  }

  const { supabase, authenticated } = await getAuthenticatedClient();
  if (!authenticated) {
    return { ok: false, message: "انتهت جلسة الإدارة. سجل الدخول مرة أخرى." };
  }

  const { error } = await supabase.rpc("confirm_admin_order", {
    p_order_id: orderId,
  });

  if (error) {
    if (error.message.includes("admin_required")) {
      return { ok: false, message: "هذه العملية متاحة للـ Super Admin فقط." };
    }

    if (error.message.includes("invalid_order_confirmation_state")) {
      return {
        ok: false,
        message: "حالة الطلب لا تسمح بالتأكيد الآن. حدّث الصفحة وحاول مرة أخرى.",
      };
    }

    return { ok: false, message: "تعذر تأكيد الطلب الآن. حاول مرة أخرى." };
  }

  revalidatePath("/dashboard-admin/orders");
  return { ok: true, message: "تم تأكيد الطلب وتحديث الحالة التشغيلية." };
}

export async function updateAdminShipmentStatus(
  _previousState: AdminOrderActionState,
  formData: FormData
): Promise<AdminOrderActionState> {
  const shipmentId = String(formData.get("shipmentId") ?? "").trim();
  const targetStatus = String(formData.get("targetStatus") ?? "").trim();

  if (!shipmentId || !SHIPMENT_TARGETS.has(targetStatus)) {
    return { ok: false, message: "طلب تحديث الشحنة غير صالح." };
  }

  const { supabase, authenticated } = await getAuthenticatedClient();
  if (!authenticated) {
    return { ok: false, message: "انتهت جلسة الإدارة. سجل الدخول مرة أخرى." };
  }

  const { error } = await supabase.rpc("update_admin_shipment_status", {
    p_shipment_id: shipmentId,
    p_target_status: targetStatus,
  });

  if (error) {
    if (error.message.includes("admin_required")) {
      return { ok: false, message: "هذه العملية متاحة للـ Super Admin فقط." };
    }

    if (error.message.includes("order_not_ready_for_shipping")) {
      return { ok: false, message: "يجب تأكيد الطلب قبل تحديث الشحن." };
    }

    if (error.message.includes("invalid_shipment_transition")) {
      return {
        ok: false,
        message: "حالة الشحنة تغيّرت أو لا تسمح بهذه الخطوة. حدّث الصفحة وحاول مرة أخرى.",
      };
    }

    return { ok: false, message: "تعذر تحديث حالة الشحنة الآن. حاول مرة أخرى." };
  }

  revalidatePath("/dashboard-admin/orders");

  const successMessage: Record<string, string> = {
    picked_up_from_artisan: "تم تسجيل استلام الشحنة من الحرفي.",
    in_transit: "تم تسجيل أن الشحنة في الطريق.",
    delivered: "تم تسجيل تسليم الشحنة.",
    delivery_failed: "تم تسجيل فشل التسليم.",
  };

  return { ok: true, message: successMessage[targetStatus] ?? "تم تحديث الشحنة." };
}

export async function updateAdminShipmentTracking(
  _previousState: AdminOrderActionState,
  formData: FormData
): Promise<AdminOrderActionState> {
  const shipmentId = String(formData.get("shipmentId") ?? "").trim();
  const courierCode = String(formData.get("courierCode") ?? "").trim().toLowerCase();
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();
  const trackingUrl = String(formData.get("trackingUrl") ?? "").trim();

  if (!shipmentId) {
    return { ok: false, message: "الشحنة غير صالحة." };
  }

  if (courierCode && !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(courierCode)) {
    return {
      ok: false,
      message: "Courier code يقبل حروف إنجليزية صغيرة وأرقام و _ أو - فقط.",
    };
  }

  if (trackingNumber.length > 128 || /[\u0000-\u001f\u007f]/.test(trackingNumber)) {
    return { ok: false, message: "رقم التتبع غير صالح." };
  }

  if (trackingUrl) {
    try {
      const parsed = new URL(trackingUrl);
      if (parsed.protocol !== "https:") {
        return { ok: false, message: "رابط التتبع يجب أن يبدأ بـ https://" };
      }
    } catch {
      return { ok: false, message: "رابط التتبع غير صالح." };
    }

    if (trackingUrl.length > 2048) {
      return { ok: false, message: "رابط التتبع طويل جدًا." };
    }
  }

  const { supabase, authenticated } = await getAuthenticatedClient();
  if (!authenticated) {
    return { ok: false, message: "انتهت جلسة الإدارة. سجل الدخول مرة أخرى." };
  }

  const { data, error } = await supabase.rpc("update_admin_shipment_tracking", {
    p_shipment_id: shipmentId,
    p_courier_code: courierCode || null,
    p_tracking_number: trackingNumber || null,
    p_tracking_url: trackingUrl || null,
  });

  if (error) {
    if (error.message.includes("admin_required")) {
      return { ok: false, message: "هذه العملية متاحة للـ Super Admin فقط." };
    }

    if (error.message.includes("shipment_not_found")) {
      return { ok: false, message: "الشحنة لم تعد موجودة. حدّث الصفحة." };
    }

    if (error.message.includes("invalid_courier_code")) {
      return { ok: false, message: "Courier code غير صالح." };
    }

    if (error.message.includes("invalid_tracking_number")) {
      return { ok: false, message: "رقم التتبع غير صالح." };
    }

    if (error.message.includes("invalid_tracking_url")) {
      return { ok: false, message: "رابط التتبع يجب أن يكون رابط HTTPS صالحًا." };
    }

    return { ok: false, message: "تعذر حفظ بيانات التتبع الآن. حاول مرة أخرى." };
  }

  revalidatePath("/dashboard-admin/orders");

  const changed = Array.isArray(data) ? Boolean(data[0]?.changed) : false;
  return {
    ok: true,
    message: changed ? "تم حفظ بيانات التتبع وتسجيل التغيير." : "بيانات التتبع لم تتغير.",
  };
}

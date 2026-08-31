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

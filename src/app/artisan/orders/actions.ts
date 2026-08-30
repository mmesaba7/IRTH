"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FulfillmentActionState = {
  ok: boolean;
  message: string | null;
};

const ALLOWED_TARGETS = new Set(["preparing", "ready_for_courier_pickup"]);

export async function updateArtisanFulfillmentStatus(
  _previousState: FulfillmentActionState,
  formData: FormData
): Promise<FulfillmentActionState> {
  const artisanGroupId = String(formData.get("artisanGroupId") ?? "").trim();
  const targetStatus = String(formData.get("targetStatus") ?? "").trim();

  if (!artisanGroupId || !ALLOWED_TARGETS.has(targetStatus)) {
    return { ok: false, message: "طلب تحديث غير صالح." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "انتهت جلسة الدخول. سجل الدخول مرة أخرى." };
  }

  const { error } = await supabase.rpc("update_my_artisan_fulfillment_status", {
    p_artisan_group_id: artisanGroupId,
    p_target_status: targetStatus,
  });

  if (error) {
    if (error.message.includes("artisan_group_not_found")) {
      return { ok: false, message: "هذا الطلب غير متاح لهذا الحساب." };
    }

    if (error.message.includes("invalid_fulfillment_transition")) {
      return {
        ok: false,
        message: "حالة التجهيز تغيّرت بالفعل أو لا تسمح بهذه الخطوة. حدّث الصفحة وحاول مرة أخرى.",
      };
    }

    return { ok: false, message: "تعذر تحديث حالة التجهيز الآن. حاول مرة أخرى." };
  }

  revalidatePath("/artisan/orders");

  return {
    ok: true,
    message:
      targetStatus === "preparing"
        ? "تم تسجيل بدء التجهيز."
        : "تم تسجيل أن الطلب جاهز للاستلام من شركة الشحن.",
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CodCollectionActionState = {
  ok: boolean;
  message: string | null;
};

export async function recordAdminCodCollected(
  _previousState: CodCollectionActionState,
  formData: FormData
): Promise<CodCollectionActionState> {
  const orderId = String(formData.get("orderId") ?? "").trim();

  if (!orderId) {
    return { ok: false, message: "الطلب غير صالح." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, message: "انتهت جلسة الإدارة. سجل الدخول مرة أخرى." };
  }

  const { data, error } = await supabase.rpc("record_admin_cod_collected", {
    p_order_id: orderId,
  });

  if (error) {
    if (error.message.includes("admin_required")) {
      return { ok: false, message: "هذه العملية متاحة للـ Super Admin فقط." };
    }
    if (error.message.includes("order_not_found")) {
      return { ok: false, message: "الطلب لم يعد موجودًا. حدّث الصفحة." };
    }
    if (error.message.includes("payment_not_found")) {
      return { ok: false, message: "سجل الدفع غير موجود لهذا الطلب." };
    }
    if (error.message.includes("cod_payment_required")) {
      return { ok: false, message: "هذا الطلب ليس دفعًا عند الاستلام." };
    }
    if (error.message.includes("cod_collection_requires_delivered_order")) {
      return { ok: false, message: "لا يمكن تسجيل تحصيل COD قبل تسليم الطلب." };
    }
    if (error.message.includes("invalid_cod_payment_state")) {
      return { ok: false, message: "حالة الدفع الحالية لا تسمح بتسجيل التحصيل." };
    }

    return { ok: false, message: "تعذر تسجيل تحصيل COD الآن. حاول مرة أخرى." };
  }

  const row = Array.isArray(data) ? data[0] : null;
  const changed = Boolean(row?.changed);

  revalidatePath("/dashboard-admin/cod");
  revalidatePath("/dashboard-admin/orders");
  revalidatePath("/dashboard-admin/payouts");

  return {
    ok: true,
    message: changed
      ? "تم تسجيل تحصيل الدفع عند الاستلام."
      : "تحصيل الدفع عند الاستلام مسجل بالفعل.",
  };
}

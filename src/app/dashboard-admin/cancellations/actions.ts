"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CancellationReviewState = {
  ok: boolean;
  message: string | null;
};

export async function reviewOrderCancellation(
  _previousState: CancellationReviewState,
  formData: FormData
): Promise<CancellationReviewState> {
  const requestId = String(formData.get("requestId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!requestId || !["approved", "rejected"].includes(decision)) {
    return { ok: false, message: "طلب المراجعة غير صالح." };
  }
  if (note.length > 1000) {
    return { ok: false, message: "ملاحظة المراجعة طويلة جدًا." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, message: "انتهت جلسة الإدارة. سجل الدخول مرة أخرى." };
  }

  const { data, error } = await supabase.rpc("admin_review_order_cancellation_request", {
    p_request_id: requestId,
    p_decision: decision,
    p_note: note || null,
  });

  if (error) {
    if (error.message.includes("admin_required")) return { ok: false, message: "هذه العملية متاحة للـ Super Admin فقط." };
    if (error.message.includes("cancellation_request_not_found")) return { ok: false, message: "طلب الإلغاء لم يعد موجودًا." };
    if (error.message.includes("cancellation_unavailable_after_courier")) return { ok: false, message: "شركة الشحن استلمت الطلب بالفعل؛ لا يمكن اعتماده كإلغاء الآن. استخدم Return / Refusal حسب الحالة." };
    if (error.message.includes("pending_cod_payment_required")) return { ok: false, message: "حالة الدفع تغيّرت ولا تسمح بالإلغاء الآن." };
    if (error.message.includes("invalid_cancellation_review_state")) return { ok: false, message: "طلب الإلغاء تمت مراجعته بالفعل أو تغيّرت حالته." };
    return { ok: false, message: "تعذر مراجعة طلب الإلغاء الآن." };
  }

  const row = Array.isArray(data) ? data[0] : null;
  const changed = Boolean(row?.changed);

  revalidatePath("/dashboard-admin/cancellations");
  revalidatePath("/dashboard-admin/orders");
  revalidatePath("/dashboard-admin/dashboard");

  return {
    ok: true,
    message: !changed
      ? "لا يوجد تغيير جديد."
      : decision === "approved"
        ? "تم اعتماد الإلغاء وإيقاف الطلب وإرجاع المخزون المحجوز."
        : "تم رفض طلب الإلغاء ويستمر الطلب بحالته الحالية.",
  };
}

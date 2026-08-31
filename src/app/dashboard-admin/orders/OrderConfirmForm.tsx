"use client";

import { useActionState } from "react";
import {
  confirmAdminOrder,
  type AdminOrderActionState,
} from "./actions";

const initialState: AdminOrderActionState = {
  ok: false,
  message: null,
};

export default function OrderConfirmForm({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(
    confirmAdminOrder,
    initialState
  );

  return (
    <form action={formAction} className="mt-3 flex flex-col items-start gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-md)] bg-[var(--color-copper)] px-4 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "جارٍ التأكيد..." : "تأكيد الطلب"}
      </button>
      {state.message && (
        <p
          aria-live="polite"
          className={`text-xs ${
            state.ok
              ? "text-[var(--text-secondary)]"
              : "text-[var(--color-terracotta)]"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

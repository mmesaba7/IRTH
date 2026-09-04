"use client";

import { useActionState } from "react";
import {
  recordAdminCodCollected,
  type CodCollectionActionState,
} from "./actions";

const initialState: CodCollectionActionState = {
  ok: false,
  message: null,
};

export default function CodCollectionForm({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(
    recordAdminCodCollected,
    initialState
  );

  return (
    <form action={formAction} className="mt-4 flex flex-col items-start gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-md)] bg-[var(--color-copper)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "جارٍ التسجيل..." : "تسجيل تحصيل COD"}
      </button>
      {state.message && (
        <p
          aria-live="polite"
          className={`text-xs ${
            state.ok
              ? "text-[var(--color-success)]"
              : "text-[var(--color-terracotta)]"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

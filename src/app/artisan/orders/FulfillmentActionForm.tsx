"use client";

import { useActionState } from "react";
import {
  updateArtisanFulfillmentStatus,
  type FulfillmentActionState,
} from "./actions";

type Props = {
  artisanGroupId: string;
  targetStatus: "preparing" | "ready_for_courier_pickup";
  label: string;
};

const initialState: FulfillmentActionState = {
  ok: false,
  message: null,
};

export default function FulfillmentActionForm({
  artisanGroupId,
  targetStatus,
  label,
}: Props) {
  const [state, formAction, pending] = useActionState(
    updateArtisanFulfillmentStatus,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="artisanGroupId" value={artisanGroupId} />
      <input type="hidden" name="targetStatus" value={targetStatus} />

      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-md)] bg-[var(--color-copper)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "جارٍ الحفظ..." : label}
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

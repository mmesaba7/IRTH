"use client";

import { useActionState } from "react";
import {
  updateAdminShipmentStatus,
  type AdminOrderActionState,
} from "./actions";

type TargetStatus =
  | "picked_up_from_artisan"
  | "in_transit"
  | "delivered"
  | "delivery_failed";

type Props = {
  shipmentId: string;
  targetStatus: TargetStatus;
  label: string;
  variant?: "primary" | "danger";
};

const initialState: AdminOrderActionState = {
  ok: false,
  message: null,
};

export default function ShipmentActionForm({
  shipmentId,
  targetStatus,
  label,
  variant = "primary",
}: Props) {
  const [state, formAction, pending] = useActionState(
    updateAdminShipmentStatus,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="shipmentId" value={shipmentId} />
      <input type="hidden" name="targetStatus" value={targetStatus} />
      <button
        type="submit"
        disabled={pending}
        className={`rounded-[var(--radius-md)] px-4 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
          variant === "danger"
            ? "border border-[var(--color-terracotta)] text-[var(--color-terracotta)] hover:bg-[var(--surface-muted)]"
            : "bg-[var(--color-copper)] text-white hover:opacity-90"
        }`}
      >
        {pending ? "جارٍ الحفظ..." : label}
      </button>
      {state.message && (
        <p
          aria-live="polite"
          className={`max-w-xs text-xs ${
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

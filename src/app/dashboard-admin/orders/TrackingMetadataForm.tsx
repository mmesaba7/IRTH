"use client";

import { useActionState } from "react";
import {
  updateAdminShipmentTracking,
  type AdminOrderActionState,
} from "./actions";

type Props = {
  shipmentId: string;
  courierCode: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
};

const initialState: AdminOrderActionState = {
  ok: false,
  message: null,
};

export default function TrackingMetadataForm({
  shipmentId,
  courierCode,
  trackingNumber,
  trackingUrl,
}: Props) {
  const [state, formAction, pending] = useActionState(
    updateAdminShipmentTracking,
    initialState
  );

  return (
    <form
      action={formAction}
      className="mt-4 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] p-4"
    >
      <input type="hidden" name="shipmentId" value={shipmentId} />

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs text-[var(--text-secondary)]">
          Courier code
          <input
            name="courierCode"
            defaultValue={courierCode ?? ""}
            maxLength={64}
            placeholder="مثال: courier_name"
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--color-espresso)]"
          />
        </label>

        <label className="text-xs text-[var(--text-secondary)]">
          Tracking number
          <input
            name="trackingNumber"
            defaultValue={trackingNumber ?? ""}
            maxLength={128}
            placeholder="رقم التتبع"
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--color-espresso)]"
          />
        </label>

        <label className="text-xs text-[var(--text-secondary)]">
          Tracking URL
          <input
            type="url"
            name="trackingUrl"
            defaultValue={trackingUrl ?? ""}
            maxLength={2048}
            placeholder="https://..."
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--color-espresso)]"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-md)] border border-[var(--color-copper)] px-4 py-2 text-xs font-medium text-[var(--color-copper)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "جارٍ حفظ التتبع..." : "حفظ بيانات التتبع"}
        </button>

        <p className="text-xs text-[var(--text-muted)]">
          رابط التتبع اختياري، وإذا أُضيف يجب أن يكون HTTPS.
        </p>
      </div>

      {state.message && (
        <p
          aria-live="polite"
          className={`mt-2 text-xs ${
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

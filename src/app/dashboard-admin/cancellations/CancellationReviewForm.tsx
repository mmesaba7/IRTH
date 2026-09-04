"use client";

import { useActionState } from "react";
import {
  reviewOrderCancellation,
  type CancellationReviewState,
} from "./actions";

const initialState: CancellationReviewState = { ok: false, message: null };

export default function CancellationReviewForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(reviewOrderCancellation, initialState);

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <div>
        <label htmlFor={`cancellation-note-${requestId}`} className="text-xs font-medium text-[var(--text-muted)]">
          ملاحظة IRTH (اختياري)
        </label>
        <textarea
          id={`cancellation-note-${requestId}`}
          name="note"
          maxLength={1000}
          rows={2}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="decision"
          value="approved"
          disabled={pending}
          className="rounded-[var(--radius-md)] bg-[var(--color-copper)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "جارٍ التنفيذ..." : "اعتماد الإلغاء"}
        </button>
        <button
          type="submit"
          name="decision"
          value="rejected"
          disabled={pending}
          className="rounded-[var(--radius-md)] border border-[var(--color-terracotta)] px-4 py-2 text-sm font-semibold text-[var(--color-terracotta)] disabled:opacity-50"
        >
          رفض الطلب
        </button>
      </div>
      {state.message && (
        <p aria-live="polite" className={`text-xs ${state.ok ? "text-[var(--color-success)]" : "text-[var(--color-terracotta)]"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}

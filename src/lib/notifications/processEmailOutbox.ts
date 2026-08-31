import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createGuestTrackingToken } from "@/lib/guestTrackingToken";
import { renderNotificationEmail } from "@/lib/notifications/emailTemplate";
import {
  assertResendConfigured,
  sendEmailWithResend,
} from "@/lib/notifications/resendEmailProvider";

type OutboxRow = {
  id: string;
  event_key: string;
  recipient_email: string;
  locale: "ar" | "en" | "auto";
  template_key: string;
  payload: Record<string, unknown>;
  source_type: string | null;
  source_id: string | null;
  dedupe_key: string;
  attempts: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOutboxRow(value: unknown): value is OutboxRow {
  if (!isRecord(value) || !isRecord(value.payload)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.event_key === "string" &&
    typeof value.recipient_email === "string" &&
    (value.locale === "ar" || value.locale === "en" || value.locale === "auto") &&
    typeof value.template_key === "string" &&
    (value.source_type === null || typeof value.source_type === "string") &&
    (value.source_id === null || typeof value.source_id === "string") &&
    typeof value.dedupe_key === "string" &&
    typeof value.attempts === "number"
  );
}

function getAppBaseUrl() {
  const configured = process.env.IRTH_APP_URL?.trim();
  if (!configured) {
    throw new Error("Missing IRTH app URL configuration");
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("Invalid IRTH app URL configuration");
  }

  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(isLocalhost && url.protocol === "http:")) {
    throw new Error("Invalid IRTH app URL configuration");
  }

  return url.origin;
}

function getPayloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function resolveEmailLink(
  row: OutboxRow,
  baseUrl: string
): Promise<string | null> {
  const audience = getPayloadString(row.payload, "audience");

  if (audience === "artisan") {
    return row.source_type === "product"
      ? `${baseUrl}/artisan/products`
      : `${baseUrl}/artisan/orders`;
  }

  if (audience !== "customer") return null;

  const orderId = getPayloadString(row.payload, "orderId");
  if (!orderId) return `${baseUrl}/account/orders`;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("order_number,customer_user_id,idempotency_scope,idempotency_key")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to resolve order email context");
  }

  if (!data) return null;

  if (data.customer_user_id) {
    return `${baseUrl}/account/orders`;
  }

  if (!data.idempotency_scope || !data.idempotency_key || !data.order_number) {
    throw new Error("Guest order email context is incomplete");
  }

  const token = createGuestTrackingToken(
    data.idempotency_scope,
    data.idempotency_key
  );

  return `${baseUrl}/track/${encodeURIComponent(data.order_number)}#access=${encodeURIComponent(token)}`;
}

async function markFailed(id: string, message: string) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("mark_notification_email_failed", {
    p_id: id,
    p_error: message,
  });

  if (error) {
    console.error("Unable to mark notification email as failed.");
  }
}

async function markSent(id: string, provider: string, messageId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("mark_notification_email_sent", {
    p_id: id,
    p_provider: provider,
    p_provider_message_id: messageId,
  });

  if (error || data !== true) {
    throw new Error("Unable to finalize notification email delivery");
  }
}

export async function processNotificationEmailOutbox(limit = 10) {
  assertResendConfigured();
  const baseUrl = getAppBaseUrl();
  const batchLimit = Math.max(1, Math.min(Math.trunc(limit) || 10, 20));
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_notification_email_outbox", {
    p_limit: batchLimit,
  });

  if (error) {
    throw new Error("Unable to claim notification email outbox");
  }

  const rows = Array.isArray(data) ? data.filter(isOutboxRow) : [];
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const link = await resolveEmailLink(row, baseUrl);
      const content = renderNotificationEmail({
        eventKey: row.template_key || row.event_key,
        locale: row.locale,
        payload: row.payload,
        link,
      });
      const result = await sendEmailWithResend({
        to: row.recipient_email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        idempotencyKey: row.dedupe_key,
      });

      await markSent(row.id, result.provider, result.messageId);
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "email_send_failed";
      await markFailed(row.id, message);
      failed += 1;
    }
  }

  return {
    claimed: rows.length,
    sent,
    failed,
  };
}

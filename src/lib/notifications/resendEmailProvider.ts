import "server-only";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

export type SendEmailResult = {
  provider: "resend";
  messageId: string;
};

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.IRTH_EMAIL_FROM?.trim();

  if (!apiKey || !apiKey.startsWith("re_") || !from) {
    throw new Error("Missing Resend email configuration");
  }

  return { apiKey, from };
}

function getProviderError(body: unknown, status: number) {
  if (typeof body === "object" && body !== null) {
    const type = "name" in body && typeof (body as { name?: unknown }).name === "string"
      ? (body as { name: string }).name
      : "provider_error";
    return `resend_${status}_${type}`;
  }

  return `resend_${status}_provider_error`;
}

export async function sendEmailWithResend(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const { apiKey, from } = getResendConfig();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
      "User-Agent": "IRTH/0.1 notification-email-worker",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(getProviderError(body, response.status));
  }

  const messageId =
    typeof body === "object" &&
    body !== null &&
    "id" in body &&
    typeof (body as { id?: unknown }).id === "string"
      ? (body as { id: string }).id.trim()
      : "";

  if (!messageId) {
    throw new Error("resend_success_without_message_id");
  }

  return { provider: "resend", messageId };
}

export function assertResendConfigured() {
  getResendConfig();
}

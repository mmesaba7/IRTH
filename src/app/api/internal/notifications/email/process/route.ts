import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { processNotificationEmailOutbox } from "@/lib/notifications/processEmailOutbox";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function authorizeProcessor(request: NextRequest) {
  const configured = process.env.IRTH_EMAIL_PROCESSOR_SECRET?.trim();
  if (!configured || configured.length < 32) {
    return { configured: false, authorized: false };
  }

  const header = request.headers.get("authorization") ?? "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!supplied) return { configured: true, authorized: false };

  return {
    configured: true,
    authorized: timingSafeEqual(digest(configured), digest(supplied)),
  };
}

function parseLimit(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("limit");
  if (!raw) return 10;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(parsed, 20));
}

export async function POST(request: NextRequest) {
  const auth = authorizeProcessor(request);

  if (!auth.configured) {
    return jsonNoStore({ error: "Email processor is not configured." }, 503);
  }

  if (!auth.authorized) {
    return jsonNoStore({ error: "Unauthorized." }, 401);
  }

  try {
    const result = await processNotificationEmailOutbox(parseLimit(request));
    return jsonNoStore(result);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Missing Resend email configuration" ||
        error.message === "Missing IRTH app URL configuration" ||
        error.message === "Invalid IRTH app URL configuration" ||
        error.message === "Missing server-side Supabase secret configuration")
    ) {
      return jsonNoStore({ error: "Email transport is not configured." }, 503);
    }

    console.error("Notification email processor failed.");
    return jsonNoStore({ error: "Unable to process notification emails." }, 500);
  }
}

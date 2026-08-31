import "server-only";

import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0, private",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function isSameOriginMutation(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function hashOpaqueToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function parseGuestToken(value: unknown) {
  if (typeof value !== "string") return null;
  const token = value.trim();
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export function cleanText(value: unknown, min: number, max: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  return cleaned.length >= min && cleaned.length <= max ? cleaned : null;
}

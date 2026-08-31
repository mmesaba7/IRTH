import "server-only";

import { createHmac } from "node:crypto";

export function createGuestTrackingToken(
  idempotencyScope: string,
  idempotencyKey: string
) {
  const secret = process.env.IRTH_GUEST_TRACKING_SECRET?.trim();

  if (!secret || secret.length < 32) {
    throw new Error("Missing guest tracking secret configuration");
  }

  return createHmac("sha256", secret)
    .update(`irth-guest-tracking:v1:${idempotencyScope}:${idempotencyKey}`)
    .digest("base64url");
}

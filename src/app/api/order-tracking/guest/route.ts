import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CustomerOrderTracking } from "@/lib/customerOrderTracking";
import { jsonNoStore } from "@/lib/serverApi";

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function parseTrackingRequest(body: unknown) {
  if (typeof body !== "object" || body === null) return null;

  const orderNumber = "orderNumber" in body ? (body as { orderNumber?: unknown }).orderNumber : null;
  const token = "token" in body ? (body as { token?: unknown }).token : null;

  if (typeof orderNumber !== "string" || typeof token !== "string") return null;

  const normalizedOrderNumber = orderNumber.trim().toUpperCase();
  const normalizedToken = token.trim();

  if (!/^IRTH-[A-Z0-9-]{8,56}$/.test(normalizedOrderNumber)) return null;
  if (!/^[A-Za-z0-9_-]{43}$/.test(normalizedToken)) return null;

  return { orderNumber: normalizedOrderNumber, token: normalizedToken };
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: "Tracking link is invalid or unavailable." }, 400);
  }

  const parsed = parseTrackingRequest(body);
  if (!parsed) {
    return jsonNoStore({ error: "Tracking link is invalid or unavailable." }, 400);
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_guest_order_tracking", {
      p_order_number: parsed.orderNumber,
      p_guest_access_token_hash: hashToken(parsed.token),
    });

    if (error) {
      console.error("Guest tracking lookup failed.");
      return jsonNoStore({ error: "Unable to load tracking right now." }, 500);
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return jsonNoStore({ error: "Tracking link is invalid or unavailable." }, 404);
    }

    return jsonNoStore({ order: data as CustomerOrderTracking });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Missing server-side Supabase secret configuration"
    ) {
      return jsonNoStore({ error: "Tracking is not configured yet." }, 503);
    }

    console.error("Unable to load guest tracking.");
    return jsonNoStore({ error: "Unable to load tracking right now." }, 500);
  }
}

import "server-only";

import type { NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PayoutServerContext = {
  user: User;
  admin: SupabaseClient;
};

export async function getPayoutServerContext(): Promise<PayoutServerContext | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;
  return { user: data.user, admin: createAdminClient() };
}

export async function getArtisanIdForUser(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("artisan_profiles")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) throw new Error("Unable to resolve artisan payout profile");
  return data?.id ?? null;
}

function sameOrigin(value: string, request: NextRequest) {
  try {
    return new URL(value).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function isSameOriginMutation(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin ? sameOrigin(origin, request) : false;
}

export function isSameOriginSensitiveRead(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin";

  const origin = request.headers.get("origin");
  if (origin) return sameOrigin(origin, request);

  const referer = request.headers.get("referer");
  return referer ? sameOrigin(referer, request) : false;
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

export function safeMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

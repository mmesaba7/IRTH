import { NextRequest } from "next/server";

import { getPayoutServerContext } from "@/lib/payouts/server";
import { jsonNoStore } from "@/lib/serverApi";

const KEY_RE = /^(homepage|brand|footer:main|help:main|contact:main|campaign:main|blog:[a-z0-9]+(?:-[a-z0-9]+)*|page:[a-z0-9]+(?:-[a-z0-9]+)*|country:[a-z0-9]+(?:-[a-z0-9]+)*)$/;

export async function GET(request: NextRequest) {
  const ctx = await getPayoutServerContext();
  if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

  const rawKey = request.nextUrl.searchParams.get("key")?.trim() ?? "";
  if (rawKey && (!KEY_RE.test(rawKey) || rawKey.length > 120)) {
    return jsonNoStore({ error: "Invalid CMS document key." }, 422);
  }

  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(Math.trunc(rawLimit), 200)) : 100;

  const { data, error } = await ctx.admin.rpc("get_admin_cms_history", {
    p_admin_user_id: ctx.user.id,
    p_document_key: rawKey || null,
    p_limit: limit,
  });

  if (error) {
    if (error.message.includes("admin_required")) {
      return jsonNoStore({ error: "Super Admin access required." }, 403);
    }
    return jsonNoStore({ error: "Unable to load CMS history." }, 500);
  }

  return jsonNoStore({ history: data ?? { documentKey: rawKey || null, limit, events: [], versions: [] } });
}

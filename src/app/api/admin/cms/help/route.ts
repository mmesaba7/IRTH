import { NextRequest } from "next/server";

import { HELP_DOCUMENT_KEY, parseHelpPayload } from "@/lib/cms/help";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { isSameOriginMutation, jsonNoStore } from "@/lib/serverApi";

async function getContext() {
  return getPayoutServerContext();
}

export async function GET() {
  const ctx = await getContext();
  if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

  const { data, error } = await ctx.admin.rpc("get_admin_cms_document", {
    p_document_key: HELP_DOCUMENT_KEY,
    p_admin_user_id: ctx.user.id,
  });
  if (error) {
    if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
    return jsonNoStore({ error: "Unable to load Help content." }, 500);
  }
  return jsonNoStore({ document: data ?? null });
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);
  const ctx = await getContext();
  if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

  let value: unknown;
  try { value = await request.json(); } catch { return jsonNoStore({ error: "Invalid Help request." }, 400); }
  const payload = parseHelpPayload(value);
  if (!payload) return jsonNoStore({ error: "Help content is invalid or incomplete." }, 422);

  const { data, error } = await ctx.admin.rpc("save_admin_cms_draft", {
    p_document_key: HELP_DOCUMENT_KEY,
    p_content_type: "help",
    p_payload: payload,
    p_admin_user_id: ctx.user.id,
  });
  if (error) {
    if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
    return jsonNoStore({ error: "Unable to save Help draft." }, 500);
  }
  return jsonNoStore({ ok: true, result: data });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);
  const ctx = await getContext();
  if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

  let body: Record<string, unknown>;
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    body = value as Record<string, unknown>;
  } catch { return jsonNoStore({ error: "Invalid publish request." }, 400); }
  if (body.action !== "publish") return jsonNoStore({ error: "Invalid publish action." }, 422);

  const { data, error } = await ctx.admin.rpc("publish_admin_cms_document", {
    p_document_key: HELP_DOCUMENT_KEY,
    p_admin_user_id: ctx.user.id,
  });
  if (error) {
    if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
    return jsonNoStore({ error: "Unable to publish Help content." }, 500);
  }
  return jsonNoStore({ ok: true, result: data });
}
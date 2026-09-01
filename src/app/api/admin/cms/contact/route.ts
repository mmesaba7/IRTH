import { NextRequest } from "next/server";
import { CONTACT_DOCUMENT_KEY, parseContactPayload } from "@/lib/cms/contact";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { isSameOriginMutation, jsonNoStore } from "@/lib/serverApi";

export async function GET() {
  const ctx = await getPayoutServerContext();
  if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
  const { data, error } = await ctx.admin.rpc("get_admin_cms_document", { p_document_key: CONTACT_DOCUMENT_KEY, p_admin_user_id: ctx.user.id });
  if (error) return jsonNoStore({ error: error.message.includes("admin_required") ? "Super Admin access required." : "Unable to load Contact content." }, error.message.includes("admin_required") ? 403 : 500);
  return jsonNoStore({ document: data ?? null });
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);
  const ctx = await getPayoutServerContext(); if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
  let raw: unknown; try { raw = await request.json(); } catch { return jsonNoStore({ error: "Invalid Contact request." }, 400); }
  const payload = parseContactPayload(raw); if (!payload) return jsonNoStore({ error: "Contact content is invalid or incomplete." }, 422);
  const { data, error } = await ctx.admin.rpc("save_admin_cms_draft", { p_document_key: CONTACT_DOCUMENT_KEY, p_content_type: "contact", p_payload: payload, p_admin_user_id: ctx.user.id });
  if (error) return jsonNoStore({ error: error.message.includes("admin_required") ? "Super Admin access required." : "Unable to save Contact draft." }, error.message.includes("admin_required") ? 403 : 500);
  return jsonNoStore({ ok: true, result: data });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);
  const ctx = await getPayoutServerContext(); if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
  let body: Record<string, unknown>; try { const raw = await request.json(); if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(); body = raw as Record<string, unknown>; } catch { return jsonNoStore({ error: "Invalid publish request." }, 400); }
  if (body.action !== "publish") return jsonNoStore({ error: "Invalid publish action." }, 422);
  const { data, error } = await ctx.admin.rpc("publish_admin_cms_document", { p_document_key: CONTACT_DOCUMENT_KEY, p_admin_user_id: ctx.user.id });
  if (error) return jsonNoStore({ error: error.message.includes("admin_required") ? "Super Admin access required." : "Unable to publish Contact content." }, error.message.includes("admin_required") ? 403 : 500);
  return jsonNoStore({ ok: true, result: data });
}
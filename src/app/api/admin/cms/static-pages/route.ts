import { NextRequest } from "next/server";

import { parseStaticPagePayload, staticPageDocumentKey } from "@/lib/cms/staticPage";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { isSameOriginMutation, jsonNoStore } from "@/lib/serverApi";

async function getContext() {
  return getPayoutServerContext();
}

export async function GET() {
  const ctx = await getContext();
  if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

  const { data, error } = await ctx.admin.rpc("get_admin_static_pages", {
    p_admin_user_id: ctx.user.id,
  });

  if (error) {
    if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
    return jsonNoStore({ error: "Unable to load static pages." }, 500);
  }

  return jsonNoStore({ pages: Array.isArray(data) ? data : [] });
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);
  const ctx = await getContext();
  if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

  let parsed: unknown;
  try { parsed = await request.json(); } catch { return jsonNoStore({ error: "Invalid static page request." }, 400); }

  const payload = parseStaticPagePayload(parsed);
  if (!payload) return jsonNoStore({ error: "Static page content is invalid or incomplete." }, 422);

  const { data, error } = await ctx.admin.rpc("save_admin_cms_draft", {
    p_document_key: staticPageDocumentKey(payload.slug),
    p_content_type: "static_page",
    p_payload: payload,
    p_admin_user_id: ctx.user.id,
  });

  if (error) {
    if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
    return jsonNoStore({ error: "Unable to save static page draft." }, 500);
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

  if (body.action !== "publish" || typeof body.slug !== "string") return jsonNoStore({ error: "Invalid publish action." }, 422);
  const slug = body.slug.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return jsonNoStore({ error: "Invalid static page slug." }, 422);

  const { data, error } = await ctx.admin.rpc("publish_admin_cms_document", {
    p_document_key: staticPageDocumentKey(slug),
    p_admin_user_id: ctx.user.id,
  });

  if (error) {
    if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
    return jsonNoStore({ error: "Unable to publish static page." }, 500);
  }

  return jsonNoStore({ ok: true, result: data });
}

import { NextRequest } from "next/server";
import { FOOTER_DOCUMENT_KEY, parseFooterPayload } from "@/lib/cms/footer";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { isSameOriginMutation, jsonNoStore } from "@/lib/serverApi";

function cmsDocumentKeyForUrl(url: string) {
  if (url === "/help") return "help:main";
  if (url === "/contact") return "contact:main";
  const pageMatch = url.match(/^\/pages\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  return pageMatch ? `page:${pageMatch[1]}` : null;
}

export async function GET() {
  const ctx = await getPayoutServerContext();
  if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
  const { data, error } = await ctx.admin.rpc("get_admin_cms_document", { p_document_key: FOOTER_DOCUMENT_KEY, p_admin_user_id: ctx.user.id });
  if (error) return jsonNoStore({ error: error.message.includes("admin_required") ? "Super Admin access required." : "Unable to load Footer content." }, error.message.includes("admin_required") ? 403 : 500);
  return jsonNoStore({ document: data ?? null });
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);
  const ctx = await getPayoutServerContext(); if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
  let raw: unknown; try { raw = await request.json(); } catch { return jsonNoStore({ error: "Invalid Footer request." }, 400); }
  const payload = parseFooterPayload(raw); if (!payload) return jsonNoStore({ error: "Footer content is invalid or incomplete." }, 422);
  const { data, error } = await ctx.admin.rpc("save_admin_cms_draft", { p_document_key: FOOTER_DOCUMENT_KEY, p_content_type: "footer", p_payload: payload, p_admin_user_id: ctx.user.id });
  if (error) return jsonNoStore({ error: error.message.includes("admin_required") ? "Super Admin access required." : "Unable to save Footer draft." }, error.message.includes("admin_required") ? 403 : 500);
  return jsonNoStore({ ok: true, result: data });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);
  const ctx = await getPayoutServerContext(); if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
  let body: Record<string, unknown>; try { const raw = await request.json(); if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(); body = raw as Record<string, unknown>; } catch { return jsonNoStore({ error: "Invalid publish request." }, 400); }
  if (body.action !== "publish") return jsonNoStore({ error: "Invalid publish action." }, 422);

  const { data: adminDocument, error: adminDocumentError } = await ctx.admin.rpc("get_admin_cms_document", { p_document_key: FOOTER_DOCUMENT_KEY, p_admin_user_id: ctx.user.id });
  if (adminDocumentError) return jsonNoStore({ error: "Unable to validate Footer draft." }, 500);
  const draft = adminDocument && typeof adminDocument === "object" && !Array.isArray(adminDocument)
    ? parseFooterPayload((adminDocument as Record<string, unknown>).draftPayload)
    : null;
  if (!draft) return jsonNoStore({ error: "Save a valid Footer draft before publishing." }, 422);

  for (const link of draft.links.filter((item) => item.visible)) {
    const documentKey = cmsDocumentKeyForUrl(link.url);
    if (!documentKey) continue;
    const { data: published, error: publishedError } = await ctx.admin.rpc("get_published_cms_document", { p_document_key: documentKey });
    if (publishedError) return jsonNoStore({ error: "Unable to validate Footer links." }, 500);
    if (!published) return jsonNoStore({ error: `Footer link ${link.url} points to CMS content that is not published.` }, 422);
  }

  const { data, error } = await ctx.admin.rpc("publish_admin_cms_document", { p_document_key: FOOTER_DOCUMENT_KEY, p_admin_user_id: ctx.user.id });
  if (error) return jsonNoStore({ error: error.message.includes("admin_required") ? "Super Admin access required." : "Unable to publish Footer content." }, error.message.includes("admin_required") ? 403 : 500);
  return jsonNoStore({ ok: true, result: data });
}
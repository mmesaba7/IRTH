import { NextRequest } from "next/server";

import { blogDocumentKey, parseBlogPayload } from "@/lib/cms/blog";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { isSameOriginMutation, jsonNoStore } from "@/lib/serverApi";

async function getContext() {
  const ctx = await getPayoutServerContext();
  if (!ctx) return null;
  return ctx;
}

export async function GET() {
  const ctx = await getContext();
  if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

  const { data, error } = await ctx.admin.rpc("get_admin_blog_posts", {
    p_admin_user_id: ctx.user.id,
  });

  if (error) {
    if (error.message.includes("admin_required")) {
      return jsonNoStore({ error: "Super Admin access required." }, 403);
    }
    return jsonNoStore({ error: "Unable to load blog posts." }, 500);
  }

  return jsonNoStore({ posts: Array.isArray(data) ? data : [] });
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);
  }

  const ctx = await getContext();
  if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return jsonNoStore({ error: "Invalid blog request." }, 400);
  }

  const payload = parseBlogPayload(parsed);
  if (!payload) {
    return jsonNoStore({ error: "Blog content is invalid or incomplete." }, 422);
  }

  const { data, error } = await ctx.admin.rpc("save_admin_cms_draft", {
    p_document_key: blogDocumentKey(payload.slug),
    p_content_type: "blog_post",
    p_payload: payload,
    p_admin_user_id: ctx.user.id,
  });

  if (error) {
    if (error.message.includes("admin_required")) {
      return jsonNoStore({ error: "Super Admin access required." }, 403);
    }
    return jsonNoStore({ error: "Unable to save blog draft." }, 500);
  }

  return jsonNoStore({ ok: true, result: data });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);
  }

  const ctx = await getContext();
  if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);

  let body: Record<string, unknown>;
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    body = value as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid publish request." }, 400);
  }

  if (body.action !== "publish" || typeof body.slug !== "string") {
    return jsonNoStore({ error: "Invalid publish action." }, 422);
  }

  const slug = body.slug.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    return jsonNoStore({ error: "Invalid blog slug." }, 422);
  }

  const { data, error } = await ctx.admin.rpc("publish_admin_cms_document", {
    p_document_key: blogDocumentKey(slug),
    p_admin_user_id: ctx.user.id,
  });

  if (error) {
    if (error.message.includes("admin_required")) {
      return jsonNoStore({ error: "Super Admin access required." }, 403);
    }
    return jsonNoStore({ error: "Unable to publish blog post." }, 500);
  }

  return jsonNoStore({ ok: true, result: data });
}

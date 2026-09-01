import { NextRequest } from "next/server";

import { getPayoutServerContext } from "@/lib/payouts/server";
import { isSameOriginMutation, jsonNoStore } from "@/lib/serverApi";

type SectionInput = {
  key: string;
  visible: boolean;
  order: number;
};

function parseSections(value: unknown, allowedKeys: Set<string>): SectionInput[] | null {
  if (!Array.isArray(value) || value.length !== allowedKeys.size) return null;

  const seen = new Set<string>();
  const orders = new Set<number>();
  const sections: SectionInput[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    const key = record.key;
    const visible = record.visible;
    const order = record.order;

    if (
      typeof key !== "string" ||
      !allowedKeys.has(key) ||
      seen.has(key) ||
      typeof visible !== "boolean" ||
      typeof order !== "number" ||
      !Number.isInteger(order) ||
      order < 1 ||
      order > allowedKeys.size ||
      orders.has(order)
    ) {
      return null;
    }

    seen.add(key);
    orders.add(order);
    sections.push({ key, visible, order });
  }

  if (seen.size !== allowedKeys.size || orders.size !== allowedKeys.size) return null;
  return sections.sort((a, b) => a.order - b.order);
}

async function loadContext() {
  const ctx = await getPayoutServerContext();
  if (!ctx) return { response: jsonNoStore({ error: "Authentication required." }, 401) } as const;

  const [{ data: document, error: documentError }, { data: registry, error: registryError }] = await Promise.all([
    ctx.admin.rpc("get_admin_cms_document", {
      p_document_key: "homepage",
      p_admin_user_id: ctx.user.id,
    }),
    ctx.admin.rpc("get_admin_cms_section_registry", {
      p_admin_user_id: ctx.user.id,
    }),
  ]);

  const error = documentError ?? registryError;
  if (error) {
    if (error.message.includes("admin_required")) {
      return { response: jsonNoStore({ error: "Super Admin access required." }, 403) } as const;
    }
    return { response: jsonNoStore({ error: "Unable to load homepage CMS." }, 500) } as const;
  }

  return {
    ctx,
    document,
    registry: Array.isArray(registry) ? registry : [],
  } as const;
}

export async function GET() {
  try {
    const result = await loadContext();
    if ("response" in result) return result.response;
    return jsonNoStore({ document: result.document, registry: result.registry });
  } catch {
    return jsonNoStore({ error: "Homepage CMS service is unavailable." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);
  }

  try {
    const result = await loadContext();
    if ("response" in result) return result.response;

    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      body = parsed as Record<string, unknown>;
    } catch {
      return jsonNoStore({ error: "Invalid CMS request." }, 400);
    }

    const allowedKeys = new Set(
      result.registry
        .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>).key : null))
        .filter((key): key is string => typeof key === "string")
    );
    const sections = parseSections(body.sections, allowedKeys);
    if (!sections) {
      return jsonNoStore({ error: "Homepage section configuration is invalid." }, 422);
    }

    const { data, error } = await result.ctx.admin.rpc("save_admin_cms_draft", {
      p_document_key: "homepage",
      p_content_type: "homepage",
      p_payload: { schemaVersion: 1, sections },
      p_admin_user_id: result.ctx.user.id,
    });

    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      return jsonNoStore({ error: "Unable to save homepage draft." }, 500);
    }

    return jsonNoStore({ ok: true, result: data });
  } catch {
    return jsonNoStore({ error: "Homepage CMS service is unavailable." }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore({ error: "Cross-origin CMS changes are not allowed." }, 403);
  }

  try {
    const result = await loadContext();
    if ("response" in result) return result.response;

    let body: Record<string, unknown> = {};
    try {
      const parsed = await request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
    } catch {
      return jsonNoStore({ error: "Invalid CMS publish request." }, 400);
    }

    if (body.action !== "publish") {
      return jsonNoStore({ error: "Invalid CMS publish action." }, 422);
    }

    const { data, error } = await result.ctx.admin.rpc("publish_admin_cms_document", {
      p_document_key: "homepage",
      p_admin_user_id: result.ctx.user.id,
    });

    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      return jsonNoStore({ error: "Unable to publish homepage." }, 500);
    }

    return jsonNoStore({ ok: true, result: data });
  } catch {
    return jsonNoStore({ error: "Homepage CMS service is unavailable." }, 503);
  }
}

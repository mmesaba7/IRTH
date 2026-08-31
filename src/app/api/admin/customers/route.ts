import { NextRequest } from "next/server";
import { getPayoutServerContext } from "@/lib/payouts/server";
import { cleanText, isSameOriginMutation, isUuid, jsonNoStore } from "@/lib/serverApi";

const LONG_SUSPENSION = "876000h";

async function loadCustomers() {
  const ctx = await getPayoutServerContext();
  if (!ctx) return { response: jsonNoStore({ error: "Authentication required." }, 401) } as const;

  const { data, error } = await ctx.admin.rpc("get_admin_customers", {
    p_admin_user_id: ctx.user.id,
  });

  if (error) {
    if (error.message.includes("admin_required")) {
      return { response: jsonNoStore({ error: "Super Admin access required." }, 403) } as const;
    }
    return { response: jsonNoStore({ error: "Unable to load customers." }, 500) } as const;
  }

  return { ctx, data: data ?? { customers: [] } } as const;
}

export async function GET() {
  try {
    const result = await loadCustomers();
    if ("response" in result) return result.response;
    return jsonNoStore(result.data);
  } catch {
    return jsonNoStore({ error: "Customer management service is unavailable." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore({ error: "Cross-origin customer changes are not allowed." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid customer management request." }, 400);
  }

  const action = body.action;
  const customerUserId = body.customerUserId;
  if ((action !== "suspend" && action !== "unsuspend" && action !== "support_note") || !isUuid(customerUserId)) {
    return jsonNoStore({ error: "Invalid customer management action." }, 422);
  }

  try {
    const result = await loadCustomers();
    if ("response" in result) return result.response;
    const { ctx, data } = result;
    const customers = typeof data === "object" && data !== null && "customers" in data && Array.isArray((data as { customers?: unknown }).customers)
      ? (data as { customers: Array<Record<string, unknown>> }).customers
      : [];
    const target = customers.find((customer) => customer.userId === customerUserId);
    if (!target) return jsonNoStore({ error: "Customer account was not found." }, 404);

    if (action === "support_note") {
      const note = cleanText(body.note, 1, 2000);
      if (!note) return jsonNoStore({ error: "Support note must be between 1 and 2000 characters." }, 422);

      const { error } = await ctx.admin.rpc("add_admin_customer_support_note", {
        p_customer_user_id: customerUserId,
        p_note: note,
        p_admin_user_id: ctx.user.id,
      });
      if (error) {
        if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
        if (error.message.includes("customer_not_found")) return jsonNoStore({ error: "Customer account was not found." }, 404);
        return jsonNoStore({ error: "Unable to save support note." }, 500);
      }
      return jsonNoStore({ ok: true });
    }

    const suspending = action === "suspend";
    const reason = suspending ? cleanText(body.reason, 1, 1000) : null;
    if (suspending && !reason) {
      return jsonNoStore({ error: "A suspension reason is required." }, 422);
    }

    const wasSuspended = target.isSuspended === true;
    if (suspending === wasSuspended) return jsonNoStore({ ok: true, unchanged: true });

    const { error: authError } = await ctx.admin.auth.admin.updateUserById(customerUserId, {
      ban_duration: suspending ? LONG_SUSPENSION : "none",
    });
    if (authError) {
      return jsonNoStore({ error: suspending ? "Unable to suspend customer login." : "Unable to restore customer login." }, 500);
    }

    const { error: auditError } = await ctx.admin.rpc("record_admin_customer_suspension_state", {
      p_customer_user_id: customerUserId,
      p_is_suspended: suspending,
      p_admin_user_id: ctx.user.id,
      p_reason: reason,
    });

    if (auditError) {
      // Best-effort compensation: keep Auth and IRTH control state aligned.
      await ctx.admin.auth.admin.updateUserById(customerUserId, {
        ban_duration: wasSuspended ? LONG_SUSPENSION : "none",
      });
      if (auditError.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      if (auditError.message.includes("customer_not_found")) return jsonNoStore({ error: "Customer account was not found." }, 404);
      return jsonNoStore({ error: "Customer login state changed but could not be audited; the change was rolled back." }, 500);
    }

    return jsonNoStore({ ok: true, isSuspended: suspending });
  } catch {
    return jsonNoStore({ error: "Customer management service is unavailable." }, 503);
  }
}

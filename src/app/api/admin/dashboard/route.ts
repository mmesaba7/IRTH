import { getPayoutServerContext } from "@/lib/payouts/server";
import { jsonNoStore } from "@/lib/serverApi";

export async function GET() {
  try {
    const ctx = await getPayoutServerContext();
    if (!ctx) return jsonNoStore({ error: "Authentication required." }, 401);
    const { data, error } = await ctx.admin.rpc("get_admin_dashboard_summary", {
      p_admin_user_id: ctx.user.id,
    });
    if (error) {
      if (error.message.includes("admin_required")) return jsonNoStore({ error: "Super Admin access required." }, 403);
      return jsonNoStore({ error: "Unable to load dashboard summary." }, 500);
    }
    return jsonNoStore(data ?? { counts: {}, commissionByCurrency: [], recentOrders: [] });
  } catch {
    return jsonNoStore({ error: "Admin dashboard service is unavailable." }, 503);
  }
}

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function isCustomerAccountSuspended(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("is_customer_account_suspended", {
    p_user_id: userId,
  });
  if (error) {
    throw new Error("Unable to verify customer account access");
  }
  return data === true;
}

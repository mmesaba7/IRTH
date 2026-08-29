import { redirect } from "next/navigation";

export default function LegacyAdminReviewPage() {
  redirect("/dashboard-admin/products");
}

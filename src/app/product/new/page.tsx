import { redirect } from "next/navigation";

export default function LegacyNewProductPage() {
  redirect("/artisan/products");
}

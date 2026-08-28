"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function artisanLogin(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    redirect("/artisan/login?error=invalid");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect("/artisan/login?error=invalid");
  }

  redirect("/artisan/dashboard");
}
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function ensureCustomerAccount(
  userId: string,
  displayName?: string
) {
  const supabase = await createClient();

  const { data: existingAccount } = await supabase
    .from("user_accounts")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existingAccount) {
    const { error: accountError } = await supabase
      .from("user_accounts")
      .insert({
        user_id: userId,
        display_name: displayName || null,
      });

    if (accountError) {
      throw new Error("Could not create customer account");
    }
  }

  const { data: customerRole, error: roleError } =
    await supabase
      .from("roles")
      .select("id")
      .eq("code", "customer")
      .single();

  if (roleError || !customerRole) {
    throw new Error("Customer role not found");
  }

  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role_id", customerRole.id)
    .maybeSingle();

  if (!existingRole) {
    const { error: userRoleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role_id: customerRole.id,
      });

    if (userRoleError) {
      throw new Error("Could not assign customer role");
    }
  }
}

function safeCustomerReturnTo(value: FormDataEntryValue | null) {
  return value === "/checkout" ? "/checkout" : "/account/orders";
}

function loginErrorUrl(error: "invalid" | "account", returnTo: string) {
  const params = new URLSearchParams({ error });
  if (returnTo === "/checkout") {
    params.set("returnTo", returnTo);
  }
  return `/account/login?${params.toString()}`;
}

export async function customerLogin(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const returnTo = safeCustomerReturnTo(formData.get("returnTo"));

  if (
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    redirect(loginErrorUrl("invalid", returnTo));
  }

  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error || !data.user) {
    redirect(loginErrorUrl("invalid", returnTo));
  }

  try {
    await ensureCustomerAccount(data.user.id);
  } catch {
    redirect(loginErrorUrl("account", returnTo));
  }

  redirect(returnTo);
}

export async function customerSignup(formData: FormData) {
  const name = formData.get("name");
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    redirect("/account/signup?error=invalid");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: name.trim(),
      },
    },
  });

  if (error || !data.user) {
    redirect("/account/signup?error=signup");
  }

  if (!data.session) {
    redirect("/account/login?status=check-email");
  }

  try {
    await ensureCustomerAccount(
      data.user.id,
      name.trim()
    );
  } catch {
    redirect("/account/signup?error=account");
  }

  redirect("/account/orders");
}

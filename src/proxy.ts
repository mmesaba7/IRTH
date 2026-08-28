import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const path = request.nextUrl.pathname;

  if (
    path === "/dashboard-admin/login" ||
    path === "/artisan/login" ||
    path === "/account/login" ||
    path === "/account/signup"
  ) {
    return response;
  }

  let requiredRole: "super_admin" | "artisan" | "customer";
  let loginPath: string;

  if (path.startsWith("/dashboard-admin")) {
    requiredRole = "super_admin";
    loginPath = "/dashboard-admin/login";
  } else if (path.startsWith("/artisan/")) {
    requiredRole = "artisan";
    loginPath = "/artisan/login";
  } else {
    requiredRole = "customer";
    loginPath = "/account/login";
  }

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return NextResponse.redirect(
      new URL(loginPath, request.url)
    );
  }

  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("code", requiredRole)
    .single();

  if (!role) {
    return NextResponse.redirect(
      new URL("/", request.url)
    );
  }

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role_id", role.id)
    .maybeSingle();

  if (!userRole) {
    return NextResponse.redirect(
      new URL("/", request.url)
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard-admin/:path*",

    "/artisan/dashboard/:path*",
    "/artisan/orders/:path*",
    "/artisan/payouts/:path*",
    "/artisan/products/:path*",
    "/artisan/promotions/:path*",
    "/artisan/reviews/:path*",
    "/account",
    "/account/orders/:path*",
  ],
};
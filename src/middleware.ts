import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // لو المسار يبدأ بـ /dashboard-admin ومش /login
  if (path.startsWith("/dashboard-admin") && !path.includes("/login")) {
    const auth = request.cookies.get("irth-admin-auth")?.value;

    if (!auth) {
      return NextResponse.redirect(new URL("/dashboard-admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard-admin/:path*"],
};
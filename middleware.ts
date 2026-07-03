import { NextRequest, NextResponse } from "next/server";

// Edge runtime: no DB here. This only bounces obviously-signed-out visitors;
// every admin page/action validates the session for real via requireStaff().
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!req.cookies.get("solace_staff")) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};

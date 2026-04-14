import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Salesperson routes require SALESPERSON/MANAGER/ADMIN role
    if (path.startsWith("/salesperson") || path.startsWith("/api/salesperson")) {
      if (!["SALESPERSON", "MANAGER", "ADMIN"].includes(token?.role as string)) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // Customer routes require CUSTOMER role (or higher)
    if (path.startsWith("/customer") || path.startsWith("/api/customer")) {
      if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        // Public paths
        if (
          path.startsWith("/api/auth") ||
          path.startsWith("/api/inventory") ||
          path === "/" ||
          path.startsWith("/login") ||
          path.startsWith("/register")
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/customer/:path*",
    "/salesperson/:path*",
    "/api/chat/:path*",
    "/api/salesperson/:path*",
    "/api/handoff/:path*",
    "/api/financing/:path*",
    "/api/metrics/:path*",
    "/api/crm/:path*",
  ],
};

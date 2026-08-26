import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Optimistic checks only — role comes straight off the session cookie, no
// DB lookups here (Proxy runs on every request, including prefetches).
// Whether a signed-in student has completed onboarding yet is checked in
// the page components themselves (they need the Student record anyway).
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/legal/terms", "/legal/privacy", "/legal/ai-disclosure"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (!session?.user && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (session?.user && (pathname === "/login" || pathname === "/signup")) {
    const destination = session.user.role === "admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(destination, req.nextUrl));
  }

  if (pathname.startsWith("/admin") && session?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

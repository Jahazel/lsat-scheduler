import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasSessionCookie, proxyRoute } from "@/lib/proxyRoute";

// Whether a signed-in student has completed onboarding yet is checked in
// the page components themselves (they need the Student record anyway).
export default auth((req) => {
  const route = proxyRoute(req.nextUrl.pathname, req.auth?.user ?? null, {
    sentSessionCookie: hasSessionCookie(req.cookies.getAll().map((cookie) => cookie.name)),
    loginReason: req.nextUrl.searchParams.get("error"),
  });
  switch (route.kind) {
    case "allow":
      return NextResponse.next();
    case "redirect":
      return NextResponse.redirect(new URL(route.to, req.nextUrl));
    case "unauthorized":
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|google-g.svg).*)"],
};

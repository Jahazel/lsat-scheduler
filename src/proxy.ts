import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ipAddressFrom } from "@/lib/clientIpAddress";
import { hasSessionCookie, proxyRoute } from "@/lib/proxyRoute";
import { NOBODY, recordSecurityEvent, type SecurityLogRoute } from "@/lib/securityLog";

// Whether a signed-in student has completed onboarding yet is checked in
// the page components themselves (they need the Student record anyway).
export default auth(async (req) => {
  const route = proxyRoute(req.nextUrl.pathname, req.auth?.user ?? null, {
    sentSessionCookie: hasSessionCookie(req.cookies.getAll().map((cookie) => cookie.name)),
    loginReason: req.nextUrl.searchParams.get("error") ?? req.nextUrl.searchParams.get("notice"),
  });
  switch (route.kind) {
    case "allow":
      return NextResponse.next();
    case "redirect":
      if (route.refused) {
        const accountId = req.auth?.user?.id;
        await recordSecurityEvent({
          event: route.refused, result: "refused", route: req.nextUrl.pathname as SecurityLogRoute,
          who: accountId ? { account: accountId } : NOBODY, ipAddress: ipAddressFrom(req.headers),
        });
      }
      return NextResponse.redirect(new URL(route.to, req.nextUrl));
    case "unauthorized":
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|google-g.svg).*)"],
};

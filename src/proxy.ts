import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ipAddressFrom } from "@/lib/clientIpAddress";
import { configuredSiteUrl } from "@/lib/email";
import { hasSessionCookie, proxyRoute } from "@/lib/proxyRoute";
import { requestPolicy } from "@/lib/requestPolicy";
import { NOBODY, recordSecurityEvent } from "@/lib/securityLog";

// Whether a signed-in student has completed onboarding yet is checked in
// the page components themselves (they need the Student record anyway).
export default auth(async (req) => {
  const siteUrl = configuredSiteUrl();
  const { refused: forged } = requestPolicy({
    method: req.method,
    pathname: req.nextUrl.pathname,
    origin: req.headers.get("origin"),
    contentType: req.headers.get("content-type"),
    siteOrigin: siteUrl && new URL(siteUrl).origin,
  });
  if (forged) {
    const accountId = req.auth?.user?.id;
    await recordSecurityEvent({
      event: "forged_request_refused", result: forged.result, route: forged.route,
      who: accountId ? { account: accountId } : NOBODY, ipAddress: ipAddressFrom(req.headers),
    });
    return NextResponse.json({ error: "Request refused" }, { status: forged.status });
  }

  const route = proxyRoute(req.nextUrl.pathname, req.auth?.user ?? null, {
    sentSessionCookie: hasSessionCookie(req.cookies.getAll().map((cookie) => cookie.name)),
    loginReason: req.nextUrl.searchParams.get("error") ?? req.nextUrl.searchParams.get("notice"),
  });
  if (route.kind !== "allow" && route.refused) {
    const accountId = req.auth?.user?.id;
    await recordSecurityEvent({
      ...route.refused, result: "refused", who: accountId ? { account: accountId } : NOBODY, ipAddress: ipAddressFrom(req.headers),
    });
  }
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

import { landingPathForRole } from "./landingPath";
import { SESSION_ENDED_PATH } from "./loginNotice";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/verify-email", "/forgot-password", "/reset-password", "/legal/terms", "/legal/privacy", "/legal/ai-disclosure"];

export type ProxyRoute = { kind: "allow" } | { kind: "redirect"; to: string } | { kind: "unauthorized" };

const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;

export const hasSessionCookie = (cookieNames: string[]) => cookieNames.some((name) => SESSION_COOKIE.test(name));

type BrowserSession = { sentSessionCookie: boolean; loginReason?: string | null };

export function proxyRoute(
  pathname: string,
  user: { role?: string } | null,
  { sentSessionCookie, loginReason }: BrowserSession = { sentSessionCookie: false },
): ProxyRoute {
  if (pathname.startsWith("/api/auth")) return { kind: "allow" };
  // Vercel Cron has no session. The route checks CRON_SECRET itself.
  if (pathname === "/api/cron/daily-cleanup") return { kind: "allow" };

  if (!user) {
    if (pathname === "/login" && sentSessionCookie && !loginReason) return { kind: "redirect", to: SESSION_ENDED_PATH };
    if (PUBLIC_ROUTES.includes(pathname)) return { kind: "allow" };
    return pathname.startsWith("/api/") ? { kind: "unauthorized" } : { kind: "redirect", to: sentSessionCookie ? SESSION_ENDED_PATH : "/login" };
  }

  if (pathname === "/login" || pathname === "/signup") return { kind: "redirect", to: landingPathForRole(user.role) };
  if (pathname.startsWith("/admin") && user.role !== "admin") return { kind: "redirect", to: "/dashboard" };
  return { kind: "allow" };
}

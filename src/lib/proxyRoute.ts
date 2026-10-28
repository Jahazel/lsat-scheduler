import { landingPathForRole } from "./landingPath";
import { SESSION_ENDED_PATH } from "./loginNotice";
import type { SecurityLogRoute } from "./securityLog";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/verify-email", "/forgot-password", "/reset-password", "/legal/terms", "/legal/privacy", "/legal/ai-disclosure"];

export type ProxyRefusal = { event: "student_data_refused" | "admin_action_refused"; route: SecurityLogRoute };

export type ProxyRoute =
  | { kind: "allow" }
  | { kind: "redirect"; to: string; refused?: ProxyRefusal }
  | { kind: "unauthorized"; refused?: ProxyRefusal };

/** Names the refusal for an Admin page or the student-data API, by route template, so no typed path reaches the security log. */
function adminRefusal(pathname: string): ProxyRefusal | undefined {
  if (pathname.startsWith("/admin/students/")) return { event: "student_data_refused", route: "/admin/students/[id]" };
  if (pathname.startsWith("/api/students/")) return { event: "student_data_refused", route: "/api/students/[id]" };
  if (pathname === "/api/students") return { event: "student_data_refused", route: "/api/students" };
  if (pathname === "/admin/test") return { event: "admin_action_refused", route: "/admin/test" };
  if (pathname.startsWith("/admin")) return { event: "admin_action_refused", route: "/admin" };
  return undefined;
}

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
    const refused = adminRefusal(pathname);
    return pathname.startsWith("/api/")
      ? { kind: "unauthorized", refused }
      : { kind: "redirect", to: sentSessionCookie ? SESSION_ENDED_PATH : "/login", refused };
  }

  if (pathname === "/login" || pathname === "/signup") return { kind: "redirect", to: landingPathForRole(user.role) };
  if (pathname.startsWith("/admin") && user.role !== "admin") return { kind: "redirect", to: "/dashboard", refused: adminRefusal(pathname) };
  return { kind: "allow" };
}

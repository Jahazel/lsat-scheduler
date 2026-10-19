import { landingPathForRole } from "./landingPath";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/legal/terms", "/legal/privacy", "/legal/ai-disclosure"];

export type ProxyRoute = { kind: "allow" } | { kind: "redirect"; to: string } | { kind: "unauthorized" };

export function proxyRoute(pathname: string, user: { role?: string } | null): ProxyRoute {
  if (pathname.startsWith("/api/auth")) return { kind: "allow" };

  if (!user) {
    if (PUBLIC_ROUTES.includes(pathname)) return { kind: "allow" };
    return pathname.startsWith("/api/") ? { kind: "unauthorized" } : { kind: "redirect", to: "/login" };
  }

  if (pathname === "/login" || pathname === "/signup") return { kind: "redirect", to: landingPathForRole(user.role) };
  if (pathname.startsWith("/admin") && user.role !== "admin") return { kind: "redirect", to: "/dashboard" };
  return { kind: "allow" };
}

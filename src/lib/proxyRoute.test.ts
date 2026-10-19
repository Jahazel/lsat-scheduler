import { describe, expect, it } from "vitest";
import { proxyRoute } from "./proxyRoute";

const student = { role: "student" };
const admin = { role: "admin" };

describe("proxy route", () => {
  it("answers a signed-out API request with 401 instead of the login page", () => {
    expect(proxyRoute("/api/analytics/extract", null)).toEqual({ kind: "unauthorized" });
    expect(proxyRoute("/api/analytics", null)).toEqual({ kind: "unauthorized" });
  });

  it("keeps the Auth.js routes open when signed out", () => {
    expect(proxyRoute("/api/auth/session", null)).toEqual({ kind: "allow" });
    expect(proxyRoute("/api/auth/callback/credentials", null)).toEqual({ kind: "allow" });
  });

  it("sends a signed-out visit to a protected page to the login page", () => {
    expect(proxyRoute("/dashboard", null)).toEqual({ kind: "redirect", to: "/login" });
    expect(proxyRoute("/onboarding", null)).toEqual({ kind: "redirect", to: "/login" });
  });

  it.each(["/", "/login", "/signup", "/legal/terms", "/legal/privacy", "/legal/ai-disclosure"])(
    "keeps the public page %s open when signed out",
    (pathname) => {
      expect(proxyRoute(pathname, null)).toEqual({ kind: "allow" });
    },
  );

  it("sends a signed-in user away from sign-in and sign-up to their landing page", () => {
    expect(proxyRoute("/login", student)).toEqual({ kind: "redirect", to: "/dashboard" });
    expect(proxyRoute("/signup", admin)).toEqual({ kind: "redirect", to: "/admin" });
  });

  it("sends a non-admin away from admin pages to This week", () => {
    expect(proxyRoute("/admin", student)).toEqual({ kind: "redirect", to: "/dashboard" });
    expect(proxyRoute("/admin/students/1", student)).toEqual({ kind: "redirect", to: "/dashboard" });
    expect(proxyRoute("/admin", admin)).toEqual({ kind: "allow" });
  });

  it("lets a signed-in student reach their pages and API routes", () => {
    expect(proxyRoute("/dashboard", student)).toEqual({ kind: "allow" });
    expect(proxyRoute("/api/analytics", student)).toEqual({ kind: "allow" });
  });
});

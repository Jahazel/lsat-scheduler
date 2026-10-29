import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { EXEMPT_ROUTES, requestPolicy, type RequestFacts } from "./requestPolicy";

const SITE = "https://drillmap.xyz";
const sameSite = (facts: Partial<RequestFacts>): RequestFacts => ({
  method: "POST", pathname: "/settings", origin: SITE, contentType: "text/plain;charset=UTF-8", siteUrl: `${SITE}/`, enforceCsp: false, development: false, ...facts,
});

describe("forged requests", () => {
  it("lets a request that reads data through with any Origin", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      expect(requestPolicy(sameSite({ method, origin: "https://evil.example", contentType: null })).refused).toBeUndefined();
    }
  });

  it("lets a same-site Server Action through with the content types Next.js sends", () => {
    expect(requestPolicy(sameSite({ contentType: "text/plain;charset=UTF-8" })).refused).toBeUndefined();
    expect(requestPolicy(sameSite({ contentType: "multipart/form-data; boundary=----x" })).refused).toBeUndefined();
  });

  it("refuses a different or missing Origin with 403 on every method that changes data", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(requestPolicy(sameSite({ method, origin: "https://evil.example" })).refused)
        .toEqual({ status: 403, result: "wrongOrigin", route: "/settings" });
    }
    expect(requestPolicy(sameSite({ origin: null })).refused).toEqual({ status: 403, result: "noOrigin", route: "/settings" });
    expect(requestPolicy(sameSite({ origin: "null" })).refused).toMatchObject({ status: 403, result: "wrongOrigin" });
    expect(requestPolicy(sameSite({ origin: "https://drillmap.xyz.evil.example" })).refused).toMatchObject({ status: 403 });
    expect(requestPolicy(sameSite({ origin: "http://drillmap.xyz" })).refused).toMatchObject({ status: 403 });
  });

  it("refuses every Origin when the place has no usable site address, and still serves reads", () => {
    for (const siteUrl of [undefined, "drillmap.xyz"]) {
      expect(requestPolicy(sameSite({ siteUrl })).refused).toMatchObject({ status: 403, result: "wrongOrigin" });
      expect(requestPolicy(sameSite({ siteUrl, method: "GET" })).refused).toBeUndefined();
    }
  });

  it("checks the Origin before the content type", () => {
    expect(requestPolicy(sameSite({ origin: null, contentType: "application/x-www-form-urlencoded" })).refused)
      .toMatchObject({ status: 403 });
  });

  it("refuses a Server Action content type that Next.js never sends with 415, including a plain HTML form's", () => {
    for (const contentType of ["application/x-www-form-urlencoded", "application/json", null]) {
      expect(requestPolicy(sameSite({ contentType })).refused).toEqual({ status: 415, result: "wrongContentType", route: "/settings" });
    }
  });

  it("lets only the extraction routes take multipart/form-data", () => {
    for (const pathname of ["/api/analytics/extract", "/api/practice-test/extract"]) {
      expect(requestPolicy(sameSite({ pathname, contentType: "multipart/form-data; boundary=x" })).refused).toBeUndefined();
      for (const contentType of ["application/json", "text/plain", "application/x-www-form-urlencoded"]) {
        expect(requestPolicy(sameSite({ pathname, contentType })).refused).toMatchObject({ status: 415, route: pathname });
      }
    }
  });

  it("lets every other API route take only application/json", () => {
    expect(requestPolicy(sameSite({ pathname: "/api/students", contentType: "application/json; charset=utf-8" })).refused).toBeUndefined();
    expect(requestPolicy(sameSite({ pathname: "/api/students", contentType: "Application/JSON" })).refused).toBeUndefined();
    for (const contentType of ["multipart/form-data; boundary=x", "text/plain", "application/x-www-form-urlencoded", "application/jsonx"]) {
      expect(requestPolicy(sameSite({ pathname: "/api/students", contentType })).refused).toMatchObject({ status: 415 });
    }
  });

  it("exempts only the Auth.js routes and the daily cleanup cron route", () => {
    expect(EXEMPT_ROUTES).toEqual([
      { path: "/api/auth/", prefix: true },
      { path: "/api/cron/daily-cleanup", prefix: false },
    ]);
    const forged = { origin: "https://evil.example", contentType: "application/x-www-form-urlencoded" };
    for (const pathname of ["/api/auth/callback/credentials", "/api/auth/signout", "/api/cron/daily-cleanup"]) {
      expect(requestPolicy(sameSite({ pathname, ...forged })).refused).toBeUndefined();
    }
    for (const pathname of ["/api/auth", "/api/authx", "/api/cron/daily-cleanup/x", "/api/cron/other"]) {
      expect(requestPolicy(sameSite({ pathname, ...forged })).refused).toMatchObject({ status: 403 });
    }
  });

  it("names a refusal by its route template, so no typed path reaches the security log", () => {
    const id = "4b3c2f80-9a8e-4c1d-b7f6-0e5d4c3b2a19";
    const refusedRoute = (pathname: string) => requestPolicy(sameSite({ pathname, origin: null })).refused?.route;
    expect(refusedRoute(`/admin/students/${id}`)).toBe("/admin/students/[id]");
    expect(refusedRoute(`/api/students/${id}`)).toBe("/api/students/[id]");
    expect(refusedRoute("/maya.chen@fastmail.com")).toBe("/other");
    expect(refusedRoute("/dashboard/secret-typed-path")).toBe("/other");
  });

  it("names every page and Route Handler in the app by its own route template", () => {
    const appDir = join(__dirname, "..", "app");
    const routeFiles = (readdirSync(appDir, { recursive: true }) as string[])
      .filter((file) => /(^|[\\/])(page\.tsx|route\.ts)$/.test(file));
    expect(routeFiles.length).toBeGreaterThan(15);
    for (const file of routeFiles) {
      const template = `/${relative(".", file).split(sep).slice(0, -1).join("/")}`.replace(/\/$/, "") || "/";
      if (template.includes("[...") || template === "/api/cron/daily-cleanup") continue;
      const pathname = template.replace("[id]", "4b3c2f80-9a8e-4c1d-b7f6-0e5d4c3b2a19");
      expect(requestPolicy(sameSite({ pathname, origin: null })).refused?.route, file).toBe(template);
    }
  });
});

const page = (facts: Partial<RequestFacts> = {}) => requestPolicy(sameSite({ method: "GET", pathname: "/dashboard", contentType: null, ...facts }));
const directives = (value: string) => new Map(value.split("; ").map((directive) => {
  const [name, ...sources] = directive.split(" ");
  return [name, sources.join(" ")];
}));

describe("security headers", () => {
  it("sends every security header on a private page, the landing page, an API route, and a refused request", () => {
    for (const facts of [{}, { pathname: "/api/students" }, { pathname: "/" }, { method: "POST", origin: "https://evil.example" }]) {
      expect(page(facts).responseHeaders).toMatchObject({
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Strict-Transport-Security": "max-age=63072000",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      });
    }
  });

  it("keeps no-referrer on the email verification and reset pages, whose URLs hold a token", () => {
    for (const pathname of ["/verify-email", "/reset-password"]) {
      expect(page({ pathname }).responseHeaders["Referrer-Policy"]).toBe("no-referrer");
    }
    expect(page({ pathname: "/reset-password/x" }).responseHeaders["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });
});

describe("content security policy", () => {
  it("allows only this site's sources, scripts and style elements that carry the request's nonce, and style attributes", () => {
    const { csp } = page();
    const nonce = /'nonce-([^']+)'/.exec(csp.value)![1];
    expect(Object.fromEntries(directives(csp.value))).toEqual({
      "default-src": "'self'",
      "script-src": `'self' 'nonce-${nonce}' 'strict-dynamic'`,
      "style-src": `'self' 'nonce-${nonce}'`,
      "style-src-attr": "'unsafe-inline'",
      "img-src": "'self' blob: data:",
      "font-src": "'self'",
      "object-src": "'none'",
      "base-uri": "'self'",
      "form-action": "'self'",
      "frame-ancestors": "'none'",
    });
  });

  it("gives each request a new nonce", () => {
    const nonces = new Set(Array.from({ length: 20 }, () => /'nonce-([^']+)'/.exec(page().csp.value)![1]));
    expect(nonces.size).toBe(20);
    for (const nonce of nonces) expect(nonce).toMatch(/^[A-Za-z0-9+/]{20,}={0,2}$/);
  });

  it("only reports by default, and enforces when the place's setting says so", () => {
    const reportOnly = page();
    expect(reportOnly.csp.header).toBe("Content-Security-Policy-Report-Only");
    expect(reportOnly.responseHeaders["Content-Security-Policy-Report-Only"]).toBe(reportOnly.csp.value);
    expect(reportOnly.responseHeaders).not.toHaveProperty("Content-Security-Policy");

    const enforced = page({ enforceCsp: true });
    expect(enforced.csp.header).toBe("Content-Security-Policy");
    expect(enforced.responseHeaders["Content-Security-Policy"]).toBe(enforced.csp.value);
    expect(enforced.responseHeaders).not.toHaveProperty("Content-Security-Policy-Report-Only");
  });

  it("allows eval in development only", () => {
    expect(directives(page().csp.value).get("script-src")).not.toContain("'unsafe-eval'");
    expect(directives(page({ development: true }).csp.value).get("script-src")).toMatch(/'strict-dynamic' 'unsafe-eval'$/);
  });
});

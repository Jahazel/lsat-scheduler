import { readdirSync } from "node:fs";
import path from "node:path";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: (handler: unknown) => handler }));

const { config, default: proxy } = await import("./proxy");

const runsProxy = (url: string) => unstable_doesMiddlewareMatch({ config, url });

const signedOutRequest = (pathname: string, headers: Record<string, string> = {}) =>
  Object.assign(new NextRequest(`http://localhost:3000${pathname}`, { headers }), { auth: null });
const run = (req: NextRequest) => (proxy as unknown as (req: NextRequest) => Promise<Response>)(req);

describe("design prototypes on the dev server", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("open signed out inside a same-site frame, and a sent policy header does not reach the page", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await run(signedOutRequest("/prototypes/this-week-redesign/screen", { "Content-Security-Policy": "script-src 'nonce-sent'" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Location")).toBeNull();
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(response.headers.get("Content-Security-Policy-Report-Only")).toContain("frame-ancestors 'self'");
    expect(response.headers.get("x-middleware-request-content-security-policy")).toBeNull();
  });

  it("still send a signed-out visitor to Log in outside the dev server", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await run(signedOutRequest("/prototypes/this-week-redesign/screen"));
    expect(response.headers.get("Location")).toMatch(/\/login/);
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  });
});

describe("proxy matcher", () => {
  it("lets every landing image load without the sign-in check", () => {
    const images = readdirSync(path.join(__dirname, "../public/landing"));
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) expect(runsProxy(`/landing/${image}`), image).toBe(false);
  });

  it("still checks sign-in for a page under /landing/", () => {
    expect(runsProxy("/landing")).toBe(true);
    expect(runsProxy("/landing/pricing")).toBe(true);
    expect(runsProxy("/landing/notes.txt")).toBe(true);
    expect(runsProxy("/landing/nested/hero.png")).toBe(true);
  });

  it("still checks sign-in for a page whose path starts with an icon's name", () => {
    expect(runsProxy("/icon.svg/admin")).toBe(true);
    expect(runsProxy("/manifest.webmanifest.json")).toBe(true);
  });

  it("checks sign-in for app pages and skips the other static files", () => {
    expect(runsProxy("/dashboard")).toBe(true);
    expect(runsProxy("/")).toBe(true);
    expect(runsProxy("/favicon.ico")).toBe(false);
    for (const icon of ["/icon.svg", "/apple-icon.png", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/maskable-512.png"]) {
      expect(runsProxy(icon), icon).toBe(false);
    }
    expect(runsProxy("/google-g.svg")).toBe(false);
    expect(runsProxy("/_next/static/chunks/main.js")).toBe(false);
  });
});

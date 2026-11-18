import { readdirSync } from "node:fs";
import path from "node:path";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: (handler: unknown) => handler }));

const { config } = await import("./proxy");

const runsProxy = (url: string) => unstable_doesMiddlewareMatch({ config, url });

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

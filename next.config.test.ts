import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "./next.config";

afterEach(() => vi.unstubAllEnvs());

describe("production deployment redirects", () => {
  it("sends a deployment URL to the Google OAuth callback's registered host", async () => {
    vi.stubEnv("VERCEL_ENV", "production");

    const redirects = await nextConfig.redirects!();
    expect(redirects).toHaveLength(1);

    const redirect = redirects[0];
    const hostPattern = new RegExp(`^${redirect.has![0].value}$`);
    expect(hostPattern.test("lsat-scheduler-6rjow71sl-jahazels-projects.vercel.app")).toBe(true);
    expect(hostPattern.test("lsat-scheduler.vercel.app")).toBe(false);
    expect(redirect.source).toBe("/:path*");
    expect(redirect.destination).toBe("https://lsat-scheduler.vercel.app/:path*");
    expect(redirect.permanent).toBe(false);
  });

  it("leaves preview deployments alone", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(await nextConfig.redirects!()).toEqual([]);
  });
});

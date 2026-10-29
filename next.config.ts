import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/lib/requestPolicy";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["src/lib/commonPasswords.txt"],
  },
  async headers() {
    // The proxy replaces these with its own, CSP and per-page referrer included, on every response it handles.
    // This covers the static files it skips.
    return [{
      source: "/:path*",
      headers: Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value })),
    }];
  },
  async redirects() {
    if (process.env.VERCEL_ENV !== "production") return [];

    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "lsat-scheduler-[a-z0-9]+-jahazels-projects\\.vercel\\.app",
          },
        ],
        destination: "https://drillmap.xyz/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

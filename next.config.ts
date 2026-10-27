import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["src/lib/commonPasswords.txt"],
  },
  async headers() {
    // A link page's URL holds a token, so no request from it may name that URL.
    return [{ source: "/verify-email", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] }];
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

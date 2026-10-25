import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

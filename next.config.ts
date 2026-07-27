import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/batch/island/:key",
        destination: "/batch/scene/:key",
        permanent: true,
      },
      {
        source: "/api/ai/island",
        destination: "/api/ai/scene",
        permanent: true,
      },
      {
        source: "/api/ai/island-kanji",
        destination: "/api/ai/scene-kanji",
        permanent: true,
      },
      {
        source: "/api/ai/island-suggestions",
        destination: "/api/ai/scene-suggestions",
        permanent: true,
      },
      {
        source: "/api/islands/:path*",
        destination: "/api/scenes/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/og.png",
        destination: "/og.jpg",
        permanent: true,
      },
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
      {
        source: "/og.jpg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
          {
            key: "Content-Type",
            value: "image/jpeg",
          },
        ],
      },
      {
        source: "/brand/matomari-logo.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Content-Type",
            value: "image/svg+xml; charset=utf-8",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

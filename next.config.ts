import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "dummyjson.com" },
    ],
  },
  poweredByHeader: false,
  eslint: {
    // Lint runs as a separate CI step via `npm run lint`.
    // next build's lint check uses a legacy detection path that
    // doesn't recognize native flat config plugins.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
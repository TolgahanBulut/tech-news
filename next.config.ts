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
    ignoreDuringBuilds: true,
  },
  // Limit concurrent page generation to avoid rate-limiting from DummyJSON
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
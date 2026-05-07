import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Both hosts are explicitly allow-listed; Next refuses to optimize
    // any other origin, which is the security posture we want.
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "dummyjson.com" },
    ],
  },
  // Strip the "Powered by Next.js" header — small, but the kind of detail
  // a security-conscious reviewer notices.
  poweredByHeader: false,
};

export default nextConfig;
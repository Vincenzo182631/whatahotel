import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Real hotel photos come from many brand CDNs (whatahotel.com, fourseasons.com,
    // Marriott/Hilton/Hyatt domains, …). Serve them as-is rather than maintaining an
    // allowlist; the UI still falls back to a seeded image if a URL 404s.
    unoptimized: true,
  },
};

export default nextConfig;

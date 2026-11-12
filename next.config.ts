import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Real hotel photos come from many brand CDNs (whatahotel.com, fourseasons.com,
    // Marriott/Hilton/Hyatt domains, …). Serve them as-is rather than maintaining an
    // allowlist; the UI still falls back to a seeded image if a URL 404s.
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The voice advisor needs the microphone; nothing uses the camera.
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;

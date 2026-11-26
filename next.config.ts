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
      {
        // The Forbes Five-Star landing page (pro.whatahotel.com/forbes-five-star-hotels) reads live rates for its
        // hotel comparison from this route in the visitor's browser. Allow that one site to call it. Read-only GET;
        // the WhataHotel API key stays on this server.
        source: "/api/rates",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://pro.whatahotel.com" },
          { key: "Access-Control-Allow-Methods", value: "GET" },
          { key: "Vary", value: "Origin" },
        ],
      },
    ];
  },
};

export default nextConfig;

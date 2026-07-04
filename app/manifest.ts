import type { MetadataRoute } from "next";

/**
 * PWA manifest — lets the team "Add to Home Screen" for a real app icon and,
 * on iOS, reliable Web Push (Apple only delivers push to an installed PWA).
 * Next serves this at /manifest.webmanifest and links it automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WhataHotel — Luxury Hotel Advisor",
    short_name: "WhataHotel",
    description:
      "Search, rank and compare the finest luxury hotels with an AI travel advisor.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#FF385C",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

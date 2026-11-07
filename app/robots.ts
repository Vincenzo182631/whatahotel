import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/schema";

/**
 * robots.txt — allow crawling of public content, keep private/app and dynamic
 * personal routes out of the index, and point crawlers at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/login",
          "/signup",
          "/reset",
          "/saved",
          "/compare",
          "/offer/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

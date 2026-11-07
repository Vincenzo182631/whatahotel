import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/schema";
import { hotelDetailsService } from "@/lib/services";
import { DESTINATIONS } from "@/lib/services/mock-data";
import { getAllArticles } from "@/lib/journal/articles";

/**
 * sitemap.xml — the public, indexable surface of the site: the static pages,
 * every journal article, every destination/city page, and every hotel (by its
 * canonical URL). Dynamic/personal routes (compare, offers, dashboard, auth,
 * saved) are intentionally excluded — they're also blocked in robots.ts.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/journal`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/find`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  const articles: MetadataRoute.Sitemap = getAllArticles().map((a) => ({
    url: `${SITE_URL}/journal/${a.slug}`,
    lastModified: a.date ? new Date(a.date) : now,
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  const cities: MetadataRoute.Sitemap = Object.keys(DESTINATIONS).map((key) => ({
    url: `${SITE_URL}/city/${key}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Every curated hotel at its canonical URL — /stay/<sourceHotelId> when it has
  // one (what /hotel/<id> redirects to), else the catalogue /hotel/<id>.
  const hotels = await hotelDetailsService.getAllHotels();
  const hotelPages: MetadataRoute.Sitemap = hotels.map((h) => ({
    url: h.sourceHotelId ? `${SITE_URL}/stay/${h.sourceHotelId}` : `${SITE_URL}/hotel/${h.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...cities, ...articles, ...hotelPages];
}

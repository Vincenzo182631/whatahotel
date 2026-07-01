/**
 * Inventory source.
 *
 * Base catalogue = the real WhataHotel directory (370 hotels), generated into
 * `hotels-generated.ts`. On top of that we overlay Google Places enrichment
 * (guest rating + photos) from `data/place-enrichment.json` when present — run
 * `node scripts/enrich-places.mjs` to populate it. With an empty cache the base
 * inventory is used unchanged.
 */
import type { Hotel } from "./types";
import { DESTINATIONS, HOTELS as RAW_HOTELS } from "./hotels-generated";
import enrichment from "@/data/place-enrichment.json";

export { DESTINATIONS };

interface Enrichment {
  rating?: number; // 0–10
  reviewCount?: number;
  photos?: string[];
  googlePlaceId?: string;
}
const PLACE = enrichment as Record<string, Enrichment>;

/** Base inventory with Google Places ratings + photos overlaid where available. */
export const HOTELS: Hotel[] = RAW_HOTELS.map((h) => {
  const e = h.sourceHotelId ? PLACE[h.sourceHotelId] : undefined;
  if (!e || (!e.rating && !e.photos?.length)) return h;
  const photos = e.photos ?? [];
  const gallery = [...photos.slice(1), h.image, ...h.gallery]
    .filter((u, i, a) => Boolean(u) && a.indexOf(u) === i)
    .slice(0, 24);
  return {
    ...h,
    rating: e.rating ?? h.rating,
    reviewCount: e.reviewCount ?? h.reviewCount,
    image: photos[0] ?? h.image,
    gallery,
  };
});

/** Resolve a free-text destination to a canonical key, or null. */
export function resolveDestination(text: string): string | null {
  const t = text.toLowerCase();
  for (const [key, meta] of Object.entries(DESTINATIONS)) {
    if (meta.aliases.some((alias) => t.includes(alias))) return key;
  }
  return null;
}

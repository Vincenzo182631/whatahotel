/**
 * Inventory source.
 *
 * Base catalogue = the real WhataHotel directory (370 hotels), generated into
 * `hotels-generated.ts`. Two enrichment overlays are applied when present:
 *  • `data/hotel-enrichment.json` — real advisor perks, derived amenities and a
 *    refreshed entry rate scraped from the source (`scripts/enrich-rates-perks.mjs`).
 *  • `data/place-enrichment.json` — Google Places guest rating + photos
 *    (`scripts/enrich-places.mjs`).
 * With empty caches the base inventory is used unchanged.
 */
import type { AdvisorPerk, Hotel } from "./types";
import { DESTINATIONS, HOTELS as RAW_HOTELS } from "./hotels-generated";
import enrichment from "@/data/place-enrichment.json";
import rateEnrichment from "@/data/hotel-enrichment.json";

export { DESTINATIONS };

interface Enrichment {
  rating?: number; // 0–10
  reviewCount?: number;
  photos?: string[];
  googlePlaceId?: string;
}
const PLACE = enrichment as Record<string, Enrichment>;

interface RateEnrichment {
  perks?: AdvisorPerk[];
  amenities?: string[];
  startingRate?: number; // USD, per night — refreshed from the live source
  localRate?: number;
  localCurrency?: string;
}
const RATES = rateEnrichment as Record<string, RateEnrichment>;

/**
 * Base inventory with two overlays applied where available:
 *  1. WhataHotel source — real advisor perks, derived amenities and a refreshed
 *     entry rate (`hotel-enrichment.json`, from `scripts/enrich-rates-perks.mjs`).
 *  2. Google Places — guest rating + photos (`place-enrichment.json`).
 */
export const HOTELS: Hotel[] = RAW_HOTELS.map((h) => {
  let hotel = h;

  // 1) Real perks / amenities / entry rate from the WhataHotel source.
  const r = h.sourceHotelId ? RATES[h.sourceHotelId] : undefined;
  if (r) {
    const amenities = [
      ...new Set([...(hotel.amenities ?? []), ...(r.amenities ?? [])]),
    ];
    hotel = {
      ...hotel,
      perks: r.perks && r.perks.length ? r.perks : hotel.perks,
      amenities,
      startingRate: r.startingRate || hotel.startingRate,
    };
  }

  // 2) Google Places rating + photos.
  const e = h.sourceHotelId ? PLACE[h.sourceHotelId] : undefined;
  if (e && (e.rating || e.photos?.length)) {
    const photos = e.photos ?? [];
    const gallery = [...photos.slice(1), hotel.image, ...hotel.gallery]
      .filter((u, i, a) => Boolean(u) && a.indexOf(u) === i)
      .slice(0, 24);
    hotel = {
      ...hotel,
      rating: e.rating ?? hotel.rating,
      reviewCount: e.reviewCount ?? hotel.reviewCount,
      image: photos[0] ?? hotel.image,
      gallery,
    };
  }

  return hotel;
});

/** Resolve a free-text destination to a canonical key, or null. */
export function resolveDestination(text: string): string | null {
  const t = text.toLowerCase();
  for (const [key, meta] of Object.entries(DESTINATIONS)) {
    if (meta.aliases.some((alias) => t.includes(alias))) return key;
  }
  return null;
}

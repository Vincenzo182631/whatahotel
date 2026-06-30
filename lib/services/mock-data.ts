/**
 * Inventory source.
 *
 * The hotel catalogue is now the REAL WhataHotel directory (370 hotels across 8
 * destinations), generated into `hotels-generated.ts` from a crawl of
 * whatahotel.com. Only source-verified fields are populated — amenities and
 * guest ratings are not published by the source and are intentionally empty.
 * Regenerate with: node scripts/generate.mjs (see /data).
 */
import { DESTINATIONS, HOTELS } from "./hotels-generated";

export { DESTINATIONS, HOTELS };

/** Resolve a free-text destination to a canonical key, or null. */
export function resolveDestination(text: string): string | null {
  const t = text.toLowerCase();
  for (const [key, meta] of Object.entries(DESTINATIONS)) {
    if (meta.aliases.some((alias) => t.includes(alias))) return key;
  }
  return null;
}

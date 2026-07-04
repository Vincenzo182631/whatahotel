import { HOTELS } from "./mock-data";
import type { Hotel } from "./types";

/**
 * In-app country listing helpers. Lets us show all our hotels for a country on
 * an in-app page (/country/<slug>) instead of linking out to WhataHotel.
 */

export function countrySlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Slugs of every country we actually have hotels for (so we only link when there's a page to show). */
export const IN_APP_COUNTRY_SLUGS = new Set(HOTELS.map((h) => countrySlug(h.country)));

export function hasCountryPage(name: string): boolean {
  return IN_APP_COUNTRY_SLUGS.has(countrySlug(name));
}

/** All hotels in a country, cheapest first. */
export function hotelsInCountry(slug: string): Hotel[] {
  return HOTELS.filter((h) => countrySlug(h.country) === slug).sort(
    (a, b) => (a.startingRate || Infinity) - (b.startingRate || Infinity),
  );
}

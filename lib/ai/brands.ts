import { getCityHotels, searchHotelsByName, type LiveHotel } from "@/lib/services/live-rates";

/**
 * Hotel brands / chains the advisor understands. When a traveller names a brand,
 * the search is LOCKED to that brand (per city) rather than falling back to the
 * best hotels overall. Order matters: more specific patterns first, so
 * "JW Marriott" and "Ritz-Carlton" win over the generic "Marriott".
 */
export interface BrandDef {
  key: string;
  label: string;
  re: RegExp;
}

export const BRANDS: BrandDef[] = [
  { key: "ritz-carlton-reserve", label: "Ritz-Carlton Reserve", re: /ritz[- ]carlton reserve/i },
  { key: "ritz-carlton", label: "Ritz-Carlton", re: /ritz[- ]carlton/i },
  { key: "st-regis", label: "St. Regis", re: /st\.?\s?regis/i },
  { key: "jw-marriott", label: "JW Marriott", re: /jw\s?marriott/i },
  { key: "w-hotels", label: "W Hotels", re: /\bw hotels?\b|\bw\s(?:miami|new york|hollywood|south beach|barcelona)/i },
  { key: "waldorf-astoria", label: "Waldorf Astoria", re: /waldorf astoria/i },
  { key: "conrad", label: "Conrad", re: /\bconrad\b/i },
  { key: "canopy", label: "Canopy by Hilton", re: /canopy/i },
  { key: "hilton", label: "Hilton", re: /\bhilton\b/i },
  { key: "park-hyatt", label: "Park Hyatt", re: /park hyatt/i },
  { key: "grand-hyatt", label: "Grand Hyatt", re: /grand hyatt/i },
  { key: "andaz", label: "Andaz", re: /\bandaz\b/i },
  { key: "hyatt", label: "Hyatt", re: /\bhyatt\b/i },
  { key: "four-seasons", label: "Four Seasons", re: /four seasons/i },
  { key: "mandarin-oriental", label: "Mandarin Oriental", re: /mandarin oriental/i },
  { key: "rosewood", label: "Rosewood", re: /\brosewood\b/i },
  { key: "aman", label: "Aman", re: /\baman(?:puri|kila|jena|resorts|yara|oi)?\b/i },
  { key: "six-senses", label: "Six Senses", re: /six senses/i },
  { key: "one-and-only", label: "One&Only", re: /one\s?&\s?only|one and only/i },
  { key: "banyan-tree", label: "Banyan Tree", re: /banyan tree/i },
  { key: "anantara", label: "Anantara", re: /anantara/i },
  { key: "kempinski", label: "Kempinski", re: /kempinski/i },
  { key: "shangri-la", label: "Shangri-La", re: /shangri-?la/i },
  { key: "raffles", label: "Raffles", re: /raffles/i },
  { key: "belmond", label: "Belmond", re: /belmond/i },
  { key: "oberoi", label: "Oberoi", re: /\boberoi\b/i },
  { key: "peninsula", label: "The Peninsula", re: /peninsula/i },
  { key: "bulgari", label: "Bulgari", re: /b[vu]lgari/i },
  { key: "cheval-blanc", label: "Cheval Blanc", re: /cheval blanc/i },
  { key: "nobu", label: "Nobu", re: /\bnobu\b/i },
  { key: "kimpton", label: "Kimpton", re: /kimpton/i },
  { key: "fairmont", label: "Fairmont", re: /fairmont/i },
  { key: "sofitel", label: "Sofitel", re: /sofitel/i },
  { key: "intercontinental", label: "InterContinental", re: /inter\s?continental/i },
  { key: "le-meridien", label: "Le Méridien", re: /le m[eé]ridien/i },
  { key: "autograph", label: "Autograph Collection", re: /autograph collection/i },
  { key: "luxury-collection", label: "The Luxury Collection", re: /luxury collection/i },
  { key: "westin", label: "Westin", re: /westin/i },
  { key: "sheraton", label: "Sheraton", re: /sheraton/i },
  { key: "renaissance", label: "Renaissance", re: /renaissance/i },
  { key: "ritz-paris", label: "Ritz Paris", re: /\britz paris\b/i },
  // Parent chain last so sub-brands above win first.
  { key: "marriott", label: "Marriott", re: /marriott/i },
];

const BY_KEY = new Map(BRANDS.map((b) => [b.key, b]));
export const brandByKey = (key: string): BrandDef | undefined => BY_KEY.get(key);

/** The brand a hotel belongs to, detected from its NAME (live hotels carry no
 *  brand field). Returns the most specific match, or null. */
export function brandOfHotelName(name: string | undefined): BrandDef | null {
  const n = (name || "").trim();
  if (!n) return null;
  for (const b of BRANDS) if (b.re.test(n)) return b;
  return null;
}

/**
 * Does this hotel match one of the REQUESTED brand keys? Tests the hotel name
 * against each requested brand's own pattern — so "Marriott" also matches
 * "JW Marriott Orlando" (it carries the Marriott name), while asking for
 * "JW Marriott" stays specific to JW Marriott. */
export function hotelMatchesBrand(name: string | undefined, brandKeys: string[]): boolean {
  if (!brandKeys.length) return true;
  const n = (name || "").trim();
  if (!n) return false;
  return brandKeys.some((k) => {
    const b = BY_KEY.get(k);
    return b ? b.re.test(n) : false;
  });
}

/**
 * Brands the traveller explicitly asked for, in order of appearance, de-duped.
 * Removes each matched span before trying broader patterns so "JW Marriott"
 * yields only JW Marriott, not JW Marriott + Marriott.
 */
export function parseAskedBrands(text: string): BrandDef[] {
  let work = ` ${text} `;
  const found: { idx: number; brand: BrandDef }[] = [];
  for (const b of BRANDS) {
    const m = work.match(b.re);
    if (m && m.index != null) {
      found.push({ idx: m.index, brand: b });
      // Blank out the matched text so a broader pattern can't re-match it.
      work = work.slice(0, m.index) + " ".repeat(m[0].length) + work.slice(m.index + m[0].length);
    }
  }
  return found.sort((a, b) => a.idx - b.idx).map((f) => f.brand);
}

/**
 * Explicit "Brand in City" pairs, e.g. "Four Seasons in Miami, Ritz-Carlton in
 * New York". Only returned when at least two pairs use DIFFERENT brands (a
 * same-brand list like "Four Seasons in Miami and New York" is handled as one
 * brand across cities by the caller). City is taken from the text after "in".
 */
export interface BrandCityPair {
  brand: BrandDef;
  city: string; // human city label, e.g. "New York"
}

export function parseBrandCityPairs(text: string): BrandCityPair[] {
  const segments = text.split(/,| and | vs\.?[ ]| versus /i);
  const pairs: BrandCityPair[] = [];
  for (const seg of segments) {
    const brand = parseAskedBrands(seg)[0];
    if (!brand) continue;
    const m = seg.match(/\bin\s+([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,2})/);
    const city = m?.[1]?.trim();
    if (city) pairs.push({ brand, city });
  }
  const distinctBrands = new Set(pairs.map((p) => p.brand.key));
  return distinctBrands.size >= 2 ? pairs : [];
}

/** Keep only hotels of the given brand(s), preserving rank order. */
export function filterByBrand(hotels: LiveHotel[], brandKeys: string[]): LiveHotel[] {
  if (!brandKeys.length) return hotels;
  return hotels.filter((h) => hotelMatchesBrand(h.name, brandKeys));
}

/** Loose city match — the hotel belongs to the requested city (guards against a
 *  brand property from a different city sneaking into a search result). */
function sameCity(hotelCity: string | undefined, hotelName: string | undefined, city: string): boolean {
  const c = city.toLowerCase().trim();
  const hc = (hotelCity || "").toLowerCase();
  const hn = (hotelName || "").toLowerCase();
  if (!c) return true;
  if (hc.includes(c) || c.includes(hc.split(/[\s,]/)[0])) return true;
  const words = c.split(/\s+/).filter((w) => w.length > 2);
  return words.some((w) => hc.includes(w) || hn.includes(w));
}

/**
 * The best-known way to find a brand's properties IN a city: scan the whole
 * catalogue by name (method=search) — this surfaces flagships that the city
 * rate-list (top ~15 by price) omits, e.g. Four Seasons in Los Angeles. Falls
 * back to filtering the city rate-list when the name search finds nothing.
 * Results carry no rates/coords yet; the caller ranks + enriches them.
 */
export async function brandHotelsForCity(opts: {
  brandLabel: string;
  brandKey: string;
  city: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}): Promise<LiveHotel[]> {
  const { brandLabel, brandKey, city, checkIn, checkOut, guests } = opts;
  const cityName = city.split(",")[0].trim();

  const hits = (await searchHotelsByName(`${brandLabel} ${cityName}`).catch(() => [])).filter(
    (h) => hotelMatchesBrand(h.name, [brandKey]) && sameCity(h.city, h.name, cityName),
  );
  if (hits.length) return hits;

  // Fallback: the city's rate list, filtered to the brand.
  if (checkIn && checkOut) {
    const live = await getCityHotels({ city: cityName, checkIn, checkOut, guests }).catch(() => []);
    return live.filter((h) => hotelMatchesBrand(h.name, [brandKey]));
  }
  return [];
}

/**
 * Specific hotel PROPERTY names in the message — a brand immediately followed by
 * a place that reads as a property ("Four Seasons Maui", "Ritz-Carlton Naples"),
 * NOT a brand-in-city ("Four Seasons IN Miami") or a generic ("Four Seasons
 * hotels"). Used to look those exact properties up by name. Returns the search
 * phrases, in order.
 */
export function parseNamedHotels(text: string): string[] {
  const brands = parseAskedBrands(text);
  if (!brands.length) return [];
  const phrases: string[] = [];
  for (const b of brands) {
    const m = b.re.exec(text);
    if (!m || m.index == null) continue;
    const after = text.slice(m.index + m[0].length);
    // Not a specific property: "in <city>", generic ("hotels"/"resorts"), a
    // proximity phrase, or a trailing preference ("with a spa").
    if (/^\s*(?:in\b|hotels?\b|resorts?\b|propert|near\b|around\b|close\b|with\b|that\b|which\b)/i.test(after))
      continue;
    // Capture the place that follows the brand (stops at a lowercase word / comma
    // / connector), allowing "at/the/of/and" links inside a longer property name.
    const placeM = after.match(
      /^\s+((?:the\s+)?[A-Z][\w.'&-]+(?:\s+(?:at|the|de|di|of|and|&)?\s*[A-Z][\w.'&-]+){0,3})/,
    );
    if (placeM?.[1]) {
      const place = placeM[1].replace(/\s+/g, " ").trim();
      phrases.push(`${m[0].trim()} ${place}`.replace(/\s+/g, " "));
    }
  }
  return [...new Set(phrases)];
}

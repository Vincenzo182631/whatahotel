/**
 * Intelligent travel-intent + geographic ranking for live hotel search.
 *
 * When a traveller asks for a hotel we first work out WHY — near the beach, near
 * the airport, honeymoon, family, business, no-car… — then rank the live API
 * results by how well each hotel actually fits that intent, using REAL data:
 *   • coordinates from the local catalogue (data/hotel-geo.json, matched by the
 *     shared sourceHotelId) → true haversine distance to a curated per-city
 *     anchor (beach / airport / cruise port / attraction);
 *   • amenities, goodFor, vibes, brand, guest rating from the same catalogue.
 *
 * No prices are ever invented; no distance is ever guessed — a distance label is
 * only produced when we have real coordinates for both the hotel and the anchor.
 */
import { HOTELS } from "@/lib/services/mock-data";
import type { Hotel, Recommendation, SearchCriteria } from "@/lib/services/types";
import type { LiveHotel } from "@/lib/services/live-rates";

export type ProximityKind =
  | "beach"
  | "airport"
  | "cruise"
  | "downtown"
  | "nightlife"
  | "shopping"
  | "attraction"
  | "transit";

export interface ProximityTarget {
  kind: ProximityKind;
  /** Human label, e.g. "the beach", "Walt Disney World", "the airport". */
  label: string;
}

export type TravelerType =
  | "honeymoon"
  | "family"
  | "business"
  | "luxury"
  | "budget"
  | "quiet"
  | "pet"
  | "accessible"
  | "walkable";

export interface TravelIntent {
  proximity: ProximityTarget | null;
  travelerTypes: TravelerType[];
  /** True when the traveller signalled they won't have a car. */
  carFree: boolean;
}

// ---------------------------------------------------------------------------
// 1. Parse intent from the message + already-extracted criteria
// ---------------------------------------------------------------------------

const PROXIMITY_PATTERNS: { kind: ProximityKind; label: string; re: RegExp }[] = [
  { kind: "beach", label: "the beach", re: /\b(beach\s*front|beachfront|ocean\s*front|oceanfront|on the (?:beach|sand)|seaside|by the sea|coastal|sea\s*view|beach)\b/i },
  { kind: "airport", label: "the airport", re: /\b(airport|near the airport|close to (?:the )?airport|early flight|catch a flight|layover|terminal)\b/i },
  { kind: "cruise", label: "the cruise port", re: /\b(cruise\s*(?:port|terminal|ship)?|cruise|embark(?:ation)?|sailing|port of|cruise line)\b/i },
  { kind: "downtown", label: "downtown", re: /\b(down\s*town|city\s*cent(?:er|re)|central|the centre|the center|heart of the city)\b/i },
  { kind: "nightlife", label: "the nightlife district", re: /\b(night\s*life|nightlife|clubs?|bars?|party|entertainment district|going out)\b/i },
  { kind: "shopping", label: "the shopping district", re: /\b(shopping|malls?|boutiques?|shops?|retail)\b/i },
];

const TRAVELER_PATTERNS: { type: TravelerType; re: RegExp }[] = [
  { type: "honeymoon", re: /\b(honey\s*moon|honeymooning|just married|newly\s*weds?|romantic (?:getaway|trip|escape)|anniversary|proposal|couples? retreat)\b/i },
  { type: "family", re: /\b(kids?|children|family|families|toddlers?|our (?:son|daughter|children)|with (?:the |our )?(?:kids|children)|child[- ]friendly)\b/i },
  { type: "business", re: /\b(business (?:trip|travel)|work trip|conference|convention|meetings?|corporate|for work|on business)\b/i },
  { type: "luxury", re: /\b(luxury|five[- ]?star|5[- ]?star|splurge|finest|most luxurious|best hotel|top hotel|ultra[- ]?luxe|opulent)\b/i },
  { type: "budget", re: /\b(budget|cheap(?:est)?|affordable|value|save money|inexpensive|economical|good deal)\b/i },
  { type: "quiet", re: /\b(quiet|peaceful|tranquil|secluded|adults?[- ]only|no kids|relaxing|calm|serene|romantic)\b/i },
  { type: "pet", re: /\b(pet[- ]?friendly|my (?:dog|cat|pet)|bringing (?:my |our )?(?:dog|pet)|travel(?:ling)? with (?:my |our )?pet)\b/i },
  { type: "accessible", re: /\b(accessible|wheel\s*chair|ada|disab(?:led|ility)|mobility|step[- ]free)\b/i },
  { type: "walkable", re: /\b(walk\s*able|walking distance|on foot|by foot|explore on foot)\b/i },
];

const CAR_FREE_RE = /\b(no car|without a car|don'?t want to (?:rent|drive)|not renting a car|no rental car|public transport(?:ation)?|metro|subway|walk everywhere|car[- ]?free)\b/i;

/** Work out the travel intent from the raw message + the running criteria. */
export function parseTravelIntent(message: string, criteria: SearchCriteria): TravelIntent {
  const text = message || "";

  // Proximity: first explicit "near <X>" landmark wins as an attraction; else a
  // category keyword. `criteria.nearby` (LLM-extracted landmark) is a strong hint.
  let proximity: ProximityTarget | null = null;
  const nearMatch = text.match(/\b(?:near|close to|next to|by|around|walking distance (?:to|from)|steps from)\s+(?:the\s+)?([A-Z][\w'&.-]*(?:\s+[A-Z][\w'&.-]*){0,4})/);
  const namedLandmark = criteria.nearby || (nearMatch ? nearMatch[1].trim() : "");

  for (const p of PROXIMITY_PATTERNS) {
    if (p.re.test(text)) {
      proximity = { kind: p.kind, label: p.label };
      break;
    }
  }
  // A specific named landmark (Disney, Eiffel Tower, the stadium…) overrides a
  // generic category unless the category was beach/airport/cruise (more specific).
  if (namedLandmark && (!proximity || proximity.kind === "downtown" || proximity.kind === "shopping")) {
    if (!/\b(down\s*town|city cent|beach|airport|cruise)\b/i.test(namedLandmark)) {
      proximity = { kind: "attraction", label: namedLandmark };
    }
  }

  const travelerTypes = new Set<TravelerType>();
  for (const t of TRAVELER_PATTERNS) if (t.re.test(text)) travelerTypes.add(t.type);
  // Fold in criteria the LLM already extracted.
  if (criteria.occasion === "honeymoon" || criteria.occasion === "anniversary") travelerTypes.add("honeymoon");
  if (criteria.occasion === "family") travelerTypes.add("family");
  if (criteria.occasion === "business") travelerTypes.add("business");
  for (const note of criteria.notes ?? []) {
    for (const t of TRAVELER_PATTERNS) if (t.re.test(note)) travelerTypes.add(t.type);
  }

  const carFree = CAR_FREE_RE.test(text);
  if (carFree) travelerTypes.add("walkable");

  return { proximity, travelerTypes: [...travelerTypes], carFree };
}

// ---------------------------------------------------------------------------
// 2. Curated per-city anchors (public coordinates — airports, beaches, ports,
//    landmarks). Used only to compute REAL distances for hotels that have
//    coordinates. Extend freely; a missing anchor just means no distance label.
// ---------------------------------------------------------------------------

type LatLng = { lat: number; lng: number };
type CityAnchors = Partial<Record<ProximityKind, { label: string } & LatLng>> & {
  landmarks?: ({ match: RegExp; label: string } & LatLng)[];
};

/** Normalise a free-text city label to a lookup key. */
function cityKey(city: string): string {
  return (city || "")
    .toLowerCase()
    .split(",")[0]
    .replace(/[^a-z\s]/g, "")
    .trim()
    .replace(/\s+/g, "");
}

const CITY_ANCHORS: Record<string, CityAnchors> = {
  miami: {
    beach: { label: "South Beach", lat: 25.7826, lng: -80.1341 },
    airport: { label: "Miami Int'l (MIA)", lat: 25.7959, lng: -80.287 },
    cruise: { label: "PortMiami", lat: 25.774, lng: -80.171 },
    downtown: { label: "Downtown Miami", lat: 25.7743, lng: -80.1937 },
    nightlife: { label: "South Beach nightlife", lat: 25.79, lng: -80.13 },
    shopping: { label: "Bal Harbour Shops", lat: 25.8886, lng: -80.1267 },
  },
  miamibeach: {
    beach: { label: "Miami Beach", lat: 25.7907, lng: -80.13 },
    airport: { label: "Miami Int'l (MIA)", lat: 25.7959, lng: -80.287 },
    cruise: { label: "PortMiami", lat: 25.774, lng: -80.171 },
  },
  orlando: {
    airport: { label: "Orlando Int'l (MCO)", lat: 28.4312, lng: -81.308 },
    downtown: { label: "Downtown Orlando", lat: 28.5383, lng: -81.3792 },
    landmarks: [
      { match: /disney|magic kingdom|epcot/i, label: "Walt Disney World", lat: 28.3852, lng: -81.5639 },
      { match: /universal/i, label: "Universal Orlando", lat: 28.4743, lng: -81.4677 },
      { match: /sea\s*world/i, label: "SeaWorld Orlando", lat: 28.4114, lng: -81.4633 },
    ],
  },
  lasvegas: {
    nightlife: { label: "the Strip", lat: 36.1147, lng: -115.1728 },
    downtown: { label: "the Strip", lat: 36.1147, lng: -115.1728 },
    airport: { label: "Harry Reid Int'l (LAS)", lat: 36.084, lng: -115.1537 },
    shopping: { label: "the Strip", lat: 36.1147, lng: -115.1728 },
  },
  newyork: {
    airport: { label: "JFK Airport", lat: 40.6413, lng: -73.7781 },
    downtown: { label: "Midtown Manhattan", lat: 40.7549, lng: -73.984 },
    nightlife: { label: "Lower Manhattan", lat: 40.725, lng: -73.995 },
    shopping: { label: "Fifth Avenue", lat: 40.7625, lng: -73.9741 },
    landmarks: [
      { match: /times square/i, label: "Times Square", lat: 40.758, lng: -73.9855 },
      { match: /central park/i, label: "Central Park", lat: 40.7829, lng: -73.9654 },
    ],
  },
  losangeles: {
    beach: { label: "Santa Monica Beach", lat: 34.0094, lng: -118.4973 },
    airport: { label: "LAX", lat: 33.9416, lng: -118.4085 },
    downtown: { label: "Downtown LA", lat: 34.0407, lng: -118.2468 },
    landmarks: [{ match: /disney/i, label: "Disneyland", lat: 33.8121, lng: -117.919 }],
  },
  paris: {
    airport: { label: "Charles de Gaulle (CDG)", lat: 49.0097, lng: 2.5479 },
    downtown: { label: "central Paris", lat: 48.8566, lng: 2.3522 },
    shopping: { label: "Champs-Élysées", lat: 48.8698, lng: 2.3078 },
    landmarks: [
      { match: /eiffel/i, label: "the Eiffel Tower", lat: 48.8584, lng: 2.2945 },
      { match: /louvre/i, label: "the Louvre", lat: 48.8606, lng: 2.3376 },
    ],
  },
  london: {
    airport: { label: "Heathrow (LHR)", lat: 51.47, lng: -0.4543 },
    downtown: { label: "central London", lat: 51.5074, lng: -0.1278 },
    shopping: { label: "Oxford Street", lat: 51.5152, lng: -0.1419 },
  },
  dubai: {
    beach: { label: "Jumeirah Beach", lat: 25.141, lng: 55.1855 },
    airport: { label: "Dubai Int'l (DXB)", lat: 25.2532, lng: 55.3657 },
    shopping: { label: "The Dubai Mall", lat: 25.1972, lng: 55.2796 },
  },
  barcelona: {
    beach: { label: "Barceloneta Beach", lat: 41.3784, lng: 2.1925 },
    airport: { label: "Barcelona (BCN)", lat: 41.2974, lng: 2.0833 },
    downtown: { label: "central Barcelona", lat: 41.3874, lng: 2.1686 },
  },
  tokyo: {
    airport: { label: "Haneda (HND)", lat: 35.5494, lng: 139.7798 },
    downtown: { label: "central Tokyo", lat: 35.6812, lng: 139.7671 },
    nightlife: { label: "Shibuya", lat: 35.6595, lng: 139.7005 },
    shopping: { label: "Ginza", lat: 35.6717, lng: 139.764 },
    landmarks: [
      { match: /shibuya/i, label: "Shibuya", lat: 35.6595, lng: 139.7005 },
      { match: /shinjuku/i, label: "Shinjuku", lat: 35.6896, lng: 139.7006 },
      { match: /ginza/i, label: "Ginza", lat: 35.6717, lng: 139.764 },
      { match: /tokyo tower/i, label: "Tokyo Tower", lat: 35.6586, lng: 139.7454 },
    ],
  },
  bali: {
    airport: { label: "Ngurah Rai (DPS)", lat: -8.7467, lng: 115.1668 },
    beach: { label: "Seminyak Beach", lat: -8.6905, lng: 115.156 },
    landmarks: [
      { match: /ubud/i, label: "Ubud", lat: -8.5069, lng: 115.2625 },
      { match: /seminyak/i, label: "Seminyak", lat: -8.6905, lng: 115.156 },
      { match: /nusa dua/i, label: "Nusa Dua", lat: -8.7972, lng: 115.2317 },
      { match: /jimbaran/i, label: "Jimbaran", lat: -8.7908, lng: 115.1573 },
    ],
  },
  maui: {
    airport: { label: "Kahului (OGG)", lat: 20.8986, lng: -156.4305 },
    beach: { label: "Wailea Beach", lat: 20.687, lng: -156.442 },
    landmarks: [
      { match: /wailea/i, label: "Wailea", lat: 20.687, lng: -156.442 },
      { match: /kaanapali/i, label: "Kaanapali Beach", lat: 20.9247, lng: -156.6947 },
      { match: /lahaina/i, label: "Lahaina", lat: 20.8783, lng: -156.6825 },
    ],
  },
  rome: {
    airport: { label: "Fiumicino (FCO)", lat: 41.8003, lng: 12.2389 },
    downtown: { label: "Rome's historic centre", lat: 41.9028, lng: 12.4964 },
    shopping: { label: "the Spanish Steps", lat: 41.9058, lng: 12.4823 },
    landmarks: [
      { match: /colosseum|colosseo/i, label: "the Colosseum", lat: 41.8902, lng: 12.4922 },
      { match: /vatican|st\.? peter/i, label: "the Vatican", lat: 41.9022, lng: 12.4539 },
      { match: /trevi/i, label: "the Trevi Fountain", lat: 41.9009, lng: 12.4833 },
      { match: /spanish steps/i, label: "the Spanish Steps", lat: 41.9058, lng: 12.4823 },
    ],
  },
  singapore: {
    airport: { label: "Changi (SIN)", lat: 1.3644, lng: 103.9915 },
    downtown: { label: "Marina Bay", lat: 1.2834, lng: 103.8607 },
    shopping: { label: "Orchard Road", lat: 1.304, lng: 103.8318 },
    landmarks: [
      { match: /marina bay|gardens by the bay/i, label: "Marina Bay", lat: 1.2834, lng: 103.8607 },
      { match: /sentosa/i, label: "Sentosa", lat: 1.2494, lng: 103.8303 },
    ],
  },
  bangkok: {
    airport: { label: "Suvarnabhumi (BKK)", lat: 13.69, lng: 100.7501 },
    downtown: { label: "central Bangkok", lat: 13.728, lng: 100.534 },
    nightlife: { label: "Sukhumvit", lat: 13.7376, lng: 100.5602 },
    shopping: { label: "Siam", lat: 13.746, lng: 100.534 },
    landmarks: [
      { match: /grand palace|wat phra/i, label: "the Grand Palace", lat: 13.75, lng: 100.4913 },
      { match: /sukhumvit/i, label: "Sukhumvit", lat: 13.7376, lng: 100.5602 },
    ],
  },
  cancun: {
    beach: { label: "the Hotel Zone beach", lat: 21.1355, lng: -86.746 },
    airport: { label: "Cancún (CUN)", lat: 21.0365, lng: -86.8771 },
    downtown: { label: "downtown Cancún", lat: 21.1619, lng: -86.8515 },
    cruise: { label: "the cruise port", lat: 20.5083, lng: -86.9458 },
  },
  honolulu: {
    beach: { label: "Waikiki Beach", lat: 21.2765, lng: -157.827 },
    airport: { label: "Honolulu (HNL)", lat: 21.3187, lng: -157.9225 },
    shopping: { label: "Ala Moana Center", lat: 21.2911, lng: -157.8434 },
  },
};

export type ResolvedAnchor = { label: string } & LatLng;

/** Resolve the coordinate anchor from the CURATED set only (sync). */
export function resolveAnchor(city: string, target: ProximityTarget): ResolvedAnchor | null {
  const anchors = CITY_ANCHORS[cityKey(city)];
  if (!anchors) return null;
  if (target.kind === "attraction" && target.label) {
    const hit = anchors.landmarks?.find((l) => l.match.test(target.label));
    if (hit) return { label: hit.label, lat: hit.lat, lng: hit.lng };
    return anchors.downtown ?? null;
  }
  const a = anchors[target.kind];
  return a ?? null;
}

// --- Live geocoding fallback (OpenStreetMap Nominatim) for any covered city ---

const KIND_QUERY: Record<ProximityKind, string> = {
  beach: "beach",
  airport: "airport",
  cruise: "cruise port",
  downtown: "city centre",
  nightlife: "city centre",
  shopping: "city centre",
  attraction: "",
  transit: "city centre",
};
const KIND_LABEL: Record<ProximityKind, string> = {
  beach: "the beach",
  airport: "the airport",
  cruise: "the cruise port",
  downtown: "the city centre",
  nightlife: "the city centre",
  shopping: "the city centre",
  attraction: "",
  transit: "the city centre",
};

// Cache per query (incl. negative results) so each city is geocoded at most once.
const geoCache = new Map<string, ResolvedAnchor | null>();

async function nominatim(query: string): Promise<LatLng | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "WhataHotelAdvisor/1.0 (info@lorrainetravel.com)" },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { lat?: string; lon?: string }[];
    if (!j[0]?.lat || !j[0]?.lon) return null;
    return { lat: +(+j[0].lat).toFixed(6), lng: +(+j[0].lon).toFixed(6) };
  } catch {
    return null; // timeout / network / block → graceful (qualitative) fallback
  } finally {
    clearTimeout(t);
  }
}

/** Geocode an anchor for a city outside the curated set. Cached, best-effort.
 *  `region` (the city's country, from the live hotels) disambiguates duplicate
 *  place names — without it "Amsterdam airport" can match the wrong continent. */
async function geocodeAnchor(
  city: string,
  target: ProximityTarget,
  region?: string,
): Promise<ResolvedAnchor | null> {
  const cityName = (city || "").split(",")[0].trim();
  if (!cityName) return null;
  const reg = (region || "").trim();
  const isAttraction = target.kind === "attraction" && Boolean(target.label);
  const base = isAttraction ? `${target.label}, ${cityName}` : `${cityName} ${KIND_QUERY[target.kind]}`;
  const query = reg ? `${base}, ${reg}` : base;
  const key = query.toLowerCase();
  if (geoCache.has(key)) return geoCache.get(key) ?? null;
  const ll = await nominatim(query);
  const label = isAttraction ? target.label : KIND_LABEL[target.kind];
  const anchor = ll ? { label, lat: ll.lat, lng: ll.lng } : null;
  geoCache.set(key, anchor);
  return anchor;
}

/**
 * Resolve a proximity anchor for ANY city: the hand-curated coordinates first
 * (most precise), then a live geocode fallback (cached) so "near the airport /
 * beach / a landmark" works for every city WhataHotel covers — not just the
 * curated set. `region` is the city's country, used to disambiguate the geocode.
 * Returns null only if geocoding also fails (→ qualitative reply).
 */
export async function getAnchor(
  city: string,
  target: ProximityTarget,
  region?: string,
): Promise<ResolvedAnchor | null> {
  const anchors = CITY_ANCHORS[cityKey(city)];
  if (target.kind === "attraction" && target.label) {
    const hit = anchors?.landmarks?.find((l) => l.match.test(target.label));
    if (hit) return { label: hit.label, lat: hit.lat, lng: hit.lng };
    const geo = await geocodeAnchor(city, target, region); // the specific landmark
    if (geo) return geo;
    return anchors?.downtown ? { ...anchors.downtown } : null;
  }
  const curated = anchors?.[target.kind];
  if (curated) return { label: curated.label, lat: curated.lat, lng: curated.lng };
  return geocodeAnchor(city, target, region);
}

/**
 * Guard against a bad geocode: an anchor should sit within the same metro as the
 * hotels. If it's implausibly far from the NEAREST hotel (> 150 km — i.e. the
 * geocoder matched a same-named place on another continent), discard it so we
 * fall back to a qualitative reply instead of showing garbage distances. Curated
 * anchors always pass (they're same-city by construction).
 */
export function validateAnchor(
  anchor: ResolvedAnchor,
  hotels: { coordinates?: LatLng }[],
): ResolvedAnchor | null {
  const coords = hotels.map((h) => h.coordinates).filter(Boolean) as LatLng[];
  if (!coords.length) return anchor; // nothing to check against; no distances computed anyway
  const minKm = Math.min(...coords.map((c) => haversineKm(c, anchor)));
  return minKm <= 150 ? anchor : null;
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function distanceLabel(km: number, anchorLabel: string): string {
  const d = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  return `~${d} from ${anchorLabel}`;
}

// ---------------------------------------------------------------------------
// 3. Enrich live hotels from the local catalogue (shared sourceHotelId) and score
// ---------------------------------------------------------------------------

let localIndex: Map<string, Hotel> | null = null;
function localBySourceId(): Map<string, Hotel> {
  if (localIndex) return localIndex;
  const m = new Map<string, Hotel>();
  for (const h of HOTELS) if (h.sourceHotelId) m.set(h.sourceHotelId, h);
  localIndex = m;
  return m;
}

/** Canonical amenity key → human phrase, for building the "why it matches" line. */
const AMENITY_PHRASE: Record<string, string> = {
  spa: "a spa",
  pool: "a pool",
  beachfront: "beachfront",
  oceanview: "ocean-view rooms",
  breakfast: "breakfast included",
  michelin: "Michelin-level dining",
  butler: "butler service",
  gym: "a gym",
  kidsclub: "a kids' club",
  airporttransfer: "airport transfers",
  rooftop: "a rooftop",
  casino: "a casino",
  ski: "ski access",
  connecting: "connecting rooms",
  fireplace: "fireplaces",
};

/** Amenities that signal fit for each traveller type. */
const TYPE_AMENITIES: Record<TravelerType, string[]> = {
  honeymoon: ["spa", "oceanview", "michelin", "butler", "rooftop", "beachfront"],
  family: ["pool", "kidsclub", "connecting", "beachfront"],
  business: ["airporttransfer", "gym", "rooftop", "breakfast"],
  luxury: ["butler", "michelin", "spa", "oceanview"],
  budget: ["breakfast"],
  quiet: ["spa", "oceanview", "fireplace"],
  pet: [],
  accessible: [],
  walkable: [],
};

const TYPE_VIBE: Partial<Record<TravelerType, string>> = {
  honeymoon: "romantic",
  family: "family",
  business: "business",
  quiet: "wellness",
};

const TYPE_OCCASION: Partial<Record<TravelerType, string>> = {
  honeymoon: "honeymoon",
  family: "family",
  business: "business",
};

/** A live hotel enriched with a relevance score + a real "why it matches" note. */
export interface RankedLiveHotel extends LiveHotel {
  coordinates?: LatLng;
  relevanceScore: number;
  matchReason?: string;
  distanceLabel?: string;
}

interface Scored {
  km: number | null;
  anchorLabel: string | null;
  score: number;
  matchedAmenities: string[];
  typeHits: TravelerType[];
}

function scoreHotel(
  h: LiveHotel,
  local: Hotel | undefined,
  coords: LatLng | undefined,
  anchor: ResolvedAnchor | null,
  intent: TravelIntent,
): Scored {
  let score = 0;
  const amenities = new Set(local?.amenities ?? []);
  const goodFor = new Set<string>(local?.goodFor ?? []);
  const vibes = new Set<string>(local?.vibes ?? []);

  // --- Proximity (real distance only) ---
  let km: number | null = null;
  let anchorLabel: string | null = null;
  if (intent.proximity) {
    if (anchor && coords) {
      km = haversineKm(coords, anchor);
      anchorLabel = anchor.label;
      // 0 km → +45, decaying to ~0 by 15 km.
      score += Math.max(0, 45 - km * 3);
    } else if (intent.proximity.kind === "beach" && amenities.has("beachfront")) {
      score += 30; // beachfront amenity is a strong signal even without coords
      anchorLabel = "the beach";
    }
  }

  // --- Traveller-type fit (amenities + goodFor + vibe) ---
  const matchedAmenities: string[] = [];
  const typeHits: TravelerType[] = [];
  for (const t of intent.travelerTypes) {
    let hit = false;
    for (const key of TYPE_AMENITIES[t]) {
      if (amenities.has(key)) {
        score += 7;
        hit = true;
        if (!matchedAmenities.includes(key)) matchedAmenities.push(key);
      }
    }
    const occ = TYPE_OCCASION[t];
    if (occ && goodFor.has(occ)) {
      score += 12;
      hit = true;
    }
    const vibe = TYPE_VIBE[t];
    if (vibe && vibes.has(vibe)) {
      score += 8;
      hit = true;
    }
    // Budget/luxury shift on brand + rating.
    if (t === "luxury") {
      if ((local?.starRating ?? 0) >= 5) score += 10;
      if (local?.brand) score += 4;
      hit = hit || (local?.starRating ?? 0) >= 5;
    }
    if (hit) typeHits.push(t);
  }

  // --- Base quality (small, keeps ties sensible) ---
  if (local?.rating) score += Math.max(0, (local.rating - 8.5) * 4);
  if (h.perks.length) score += Math.min(6, h.perks.length * 1.5);

  return { km, anchorLabel, score, matchedAmenities, typeHits };
}

function buildReason(
  s: Scored,
  intent: TravelIntent,
  hasLocal: boolean,
): { matchReason?: string; distanceLabel?: string } {
  const parts: string[] = [];
  let distLabel: string | undefined;

  if (s.km != null && s.anchorLabel) {
    distLabel = distanceLabel(s.km, s.anchorLabel);
  } else if (s.anchorLabel && intent.proximity?.kind === "beach") {
    parts.push("right on the beach");
  }

  const phrases = s.matchedAmenities.map((k) => AMENITY_PHRASE[k]).filter(Boolean).slice(0, 3);
  if (s.typeHits.length) {
    const t = s.typeHits[0];
    const lead: Record<TravelerType, string> = {
      honeymoon: "Romantic pick",
      family: "Family-friendly",
      business: "Business-ready",
      luxury: "Top-tier luxury",
      budget: "Good value",
      quiet: "Calm & restful",
      pet: "Pet-friendly",
      accessible: "Accessible",
      walkable: "Walkable base",
    };
    parts.push(lead[t]);
  }
  if (phrases.length) parts.push(`with ${phrases.join(", ")}`);

  const matchReason = parts.length && hasLocal ? parts.join(" · ").replace(" · with", " with") : undefined;
  return { matchReason, distanceLabel: distLabel };
}

/**
 * Rank live API hotels by travel-intent fit. Enriches from the local catalogue
 * (coords/amenities) with no extra API calls. When the intent is strongly
 * geographic (beach / airport / cruise) and we can resolve enough nearby
 * options, clearly-irrelevant far-flung hotels are filtered out. With no
 * discernible intent, the original (cheapest-first) order is preserved.
 */
export function rankLiveHotels(
  hotels: LiveHotel[],
  intent: TravelIntent,
  anchor: ResolvedAnchor | null,
): RankedLiveHotel[] {
  const idx = localBySourceId();
  const hasIntent = Boolean(intent.proximity) || intent.travelerTypes.length > 0;

  const enriched: (RankedLiveHotel & { _km: number | null })[] = hotels.map((h, i) => {
    const local = idx.get(h.sourceHotelId);
    // Prefer coordinates already attached to the live hotel (from getLiveHotel
    // enrichment); fall back to the local catalogue's coordinates.
    const coords = h.coordinates ?? local?.coordinates;
    const s = scoreHotel(h, local, coords, anchor, intent);
    const { matchReason, distanceLabel: dl } = buildReason(s, intent, Boolean(local));
    return {
      ...h,
      coordinates: coords,
      relevanceScore: s.score,
      matchReason,
      distanceLabel: dl,
      _km: s.km,
      // Preserve original cheapest-first order as the tie-breaker.
      rank: h.rank ?? i,
    };
  });

  if (!hasIntent) {
    return enriched.map(({ _km, ...h }) => h); // untouched order
  }

  // Sort by relevance, then original order.
  enriched.sort((a, b) => b.relevanceScore - a.relevanceScore || (a.rank ?? 0) - (b.rank ?? 0));

  // Geographic filtering: for a beach/airport/cruise intent, if we have at least
  // 3 hotels with a real distance under a sensible radius, drop the clearly-far
  // ones (but never go below 3 results).
  const geoIntent = intent.proximity && ["beach", "airport", "cruise"].includes(intent.proximity.kind);
  if (geoIntent) {
    const RADIUS_KM = intent.proximity!.kind === "airport" ? 8 : 6;
    const near = enriched.filter((h) => h._km != null && h._km <= RADIUS_KM);
    if (near.length >= 3) {
      return near.map(({ _km, ...h }) => h);
    }
  }

  return enriched.map(({ _km, ...h }) => h);
}

/**
 * Re-rank the local catalogue's recommendations by a geographic intent, blending
 * the engine's fit score with a real-distance boost to the requested anchor, and
 * annotate each with a distance label. The engine already covers occasion /
 * amenity / vibe fit, so this adds the one thing it lacks — true proximity.
 * When the intent has no resolvable anchor for the city, the order is untouched.
 */
export function applyIntentRanking(
  recs: Recommendation[],
  intent: TravelIntent,
  limit: number,
  anchor: ResolvedAnchor | null,
): Recommendation[] {
  if (!anchor) return recs.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 }));

  const scored = recs.map((r) => {
    const c = r.coordinates;
    let boost = 0;
    let label: string | undefined;
    if (c && c.lat && c.lng) {
      const km = haversineKm(c, anchor);
      // Only meaningful within ~12 km — beyond that the anchor is equally "far"
      // for every city hotel (e.g. a downtown hotel vs. a distant airport), so a
      // distance neither reorders nor is worth showing.
      if (km <= 12) {
        boost = Math.max(0, 30 - km * 3); // 0 km → +30, ~0 by 10 km
        label = distanceLabel(km, anchor.label);
      }
    }
    return { rec: r, blended: r.matchScore + boost, label };
  });
  scored.sort((a, b) => b.blended - a.blended);
  return scored.slice(0, limit).map((s, i) => ({ ...s.rec, rank: i + 1, distanceLabel: s.label }));
}

/** One-line summary of the intent for the reply prompt. */
export function summarizeIntent(intent: TravelIntent): string {
  const bits: string[] = [];
  if (intent.proximity) bits.push(`near ${intent.proximity.label}`);
  if (intent.travelerTypes.length) bits.push(intent.travelerTypes.join(" + "));
  if (intent.carFree) bits.push("no car");
  return bits.join(", ") || "general stay";
}

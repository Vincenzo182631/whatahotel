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
};

/** Resolve the coordinate anchor for a proximity intent in a city, if known. */
export function resolveAnchor(
  city: string,
  target: ProximityTarget,
): ({ label: string } & LatLng) | null {
  const anchors = CITY_ANCHORS[cityKey(city)];
  if (!anchors) return null;
  if (target.kind === "attraction" && target.label) {
    const hit = anchors.landmarks?.find((l) => l.match.test(target.label));
    if (hit) return { label: hit.label, lat: hit.lat, lng: hit.lng };
    // Fall back to downtown for an unknown named landmark.
    return anchors.downtown ?? null;
  }
  const a = anchors[target.kind];
  return a ?? null;
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
  city: string,
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
    const anchor = resolveAnchor(city, intent.proximity);
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
  city: string,
  intent: TravelIntent,
): RankedLiveHotel[] {
  const idx = localBySourceId();
  const hasIntent = Boolean(intent.proximity) || intent.travelerTypes.length > 0;

  const enriched: (RankedLiveHotel & { _km: number | null })[] = hotels.map((h, i) => {
    const local = idx.get(h.sourceHotelId);
    // Prefer coordinates already attached to the live hotel (from getLiveHotel
    // enrichment); fall back to the local catalogue's coordinates.
    const coords = h.coordinates ?? local?.coordinates;
    const s = scoreHotel(h, local, coords, city, intent);
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
  city: string,
  intent: TravelIntent,
  limit: number,
): Recommendation[] {
  const anchor = intent.proximity ? resolveAnchor(city, intent.proximity) : null;
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

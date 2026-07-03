import { getLiveRates, getHotelInfo, type LiveRoom } from "@/lib/services/live-rates";
import { CITY_POIS, type CityPois } from "@/lib/ai/itinerary-data";
import type { Hotel } from "@/lib/services/types";

/**
 * Hotel knowledge base ("dossier") builder.
 *
 * Assembles EVERYTHING the luxury-advisor chatbot can honestly say about a
 * single property, drawn from real sources and prioritised:
 *   1. Internal curated hotel record (identity, brand, perks, distances, vibes)
 *   2. Live WhataHotel `method=info`   → real description, amenities, dining, tax
 *   3. Live WhataHotel `method=rates`  → the real room catalogue (names, features)
 *   4. Curated destination POIs        → nearby attractions, dining, cafés, transport
 *
 * The result is a single structured brief injected into the system prompt so the
 * AI answers from facts, never invents them, and knows exactly what it does and
 * doesn't have. Live PRICING is deliberately excluded — rates are only ever
 * quoted live for the guest's own dates in the on-page Rooms section.
 *
 * Server-side only. Cached per hotel so the (real) API calls run once.
 */

export interface HotelDossier {
  /** The full structured knowledge brief for the system prompt. */
  brief: string;
  /** Real room categories (for the model to reason over room-level questions). */
  rooms: { name: string; description?: string; bedType?: string }[];
  /** Whether curated destination knowledge exists for this city. */
  hasArea: boolean;
  city: string;
}

const CACHE_TTL = 30 * 60_000; // 30 min
const cache = new Map<string, { ts: number; data: HotelDossier }>();

/** "oceanView" / "kidsclub" → "Ocean View" / "Kids Club". */
function readable(k: string): string {
  return k
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** A YYYY-MM-DD date `days` from today (UTC), for probing the room catalogue. */
function futureDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * Probe live availability on a couple of near-future ranges to recover the real
 * room catalogue (names, descriptions, bed types) even before the guest picks
 * dates. We use it only for room FEATURES — never to quote a price.
 */
async function probeRoomCatalogue(sourceHotelId: string): Promise<LiveRoom[]> {
  for (const offset of [30, 90]) {
    const rates = await getLiveRates({
      sourceHotelId,
      checkIn: futureDate(offset),
      checkOut: futureDate(offset + 3),
    });
    if (rates && rates.rooms.length) return rates.rooms;
  }
  return [];
}

function areaBlock(pois: CityPois, city: string): string {
  const list = (items: { name: string }[]) => items.map((x) => x.name).join(", ");
  return [
    `DESTINATION KNOWLEDGE — around ${city} (curated; suggest confirming current hours/prices):`,
    `- Attractions: ${list(pois.attractions)}`,
    `- Restaurants nearby: ${pois.dining.map((d) => `${d.name}${d.cuisine ? ` (${d.cuisine})` : ""}`).join(", ")}`,
    `- Cafés: ${list(pois.cafes)}`,
    `- Bars & nightlife: ${list(pois.bars)}`,
    `- Museums & culture: ${list(pois.museums)}`,
    `- Parks & nature: ${list(pois.parks)}`,
    `- Shopping: ${list(pois.shopping)}`,
    `- Experiences: ${list(pois.entertainment)}`,
    `- Getting around: ${pois.transport}`,
  ].join("\n");
}

/**
 * Build (or return cached) the complete knowledge dossier for a hotel.
 * `liveAmenities` / `liveDining` let a caller that already resolved a live-only
 * hotel pass those in; otherwise they're fetched here.
 */
export async function buildHotelDossier(
  hotel: Hotel,
  opts: { liveAmenities?: string[]; liveDining?: string[] } = {},
): Promise<HotelDossier> {
  const cacheKey = hotel.sourceHotelId || hotel.id;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  // Fetch live info + probe the room catalogue in parallel.
  const [info, catalogue] = await Promise.all([
    opts.liveAmenities || opts.liveDining
      ? Promise.resolve(null)
      : getHotelInfo(hotel.name, hotel.city).catch(() => null),
    hotel.sourceHotelId ? probeRoomCatalogue(hotel.sourceHotelId).catch(() => []) : Promise.resolve([]),
  ]);

  const liveAmenities = opts.liveAmenities ?? info?.amenities ?? [];
  const liveDining = opts.liveDining ?? info?.restaurants ?? [];
  const liveDescription = info?.description;
  const tax = info?.tax;

  // ---- Identity -----------------------------------------------------------
  const location = [hotel.neighborhood && hotel.neighborhood !== hotel.city ? hotel.neighborhood : "", hotel.city, hotel.country]
    .filter(Boolean)
    .join(", ");
  const identity = [
    `HOTEL: ${hotel.name}${hotel.brand ? ` — a ${hotel.brand} property` : ""}`,
    hotel.starRating ? `Class: ${hotel.starRating}-star luxury` : "",
    `Location: ${location}`,
    hotel.rating > 0 ? `Guest rating: ${hotel.rating}/10${hotel.reviewCount ? ` (${hotel.reviewCount} reviews)` : ""}` : "",
    hotel.vibes?.length ? `Style / vibe: ${hotel.vibes.map(readable).join(", ")}` : "",
    hotel.goodFor?.length ? `Well suited to: ${hotel.goodFor.map(readable).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // ---- Overview -----------------------------------------------------------
  const overview = [liveDescription, hotel.description]
    .map((s) => (s || "").trim())
    .filter((s) => s && !/EXCLUSIVE COMPLIMENTARY PERKS/i.test(s)) // drop boilerplate
    .filter((s, i, a) => a.indexOf(s) === i)
    .join(" ");

  // ---- Amenities & facilities --------------------------------------------
  const curatedAmenities = (hotel.amenities ?? []).map(readable);
  const cleanedLive = liveAmenities
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && s.length <= 48 && /[a-z]/.test(s) && !/\d+\.\d{2}/.test(s));
  const amenities = [...curatedAmenities, ...cleanedLive].filter(
    (s, i, a) => a.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i,
  );

  // ---- Rooms --------------------------------------------------------------
  const rooms = catalogue.map((r) => ({ name: r.name, description: r.description, bedType: r.bedType }));
  const roomsBlock = rooms.length
    ? rooms
        .map((r) => `- ${r.name}${r.bedType ? ` · ${r.bedType}` : ""}${r.description ? `: ${r.description}` : ""}`)
        .join("\n")
    : "";

  // ---- Perks --------------------------------------------------------------
  const perks = (hotel.perks ?? [])
    .map((p) => `${p.label}${p.detail && !/whatahotel/i.test(p.detail) ? ` (${p.detail})` : ""}`)
    .filter(Boolean);

  // ---- Distances / getting around ----------------------------------------
  const distances = (hotel.distances ?? []).map((d) => `${d.label}: ${d.value}`);

  // ---- Destination knowledge ---------------------------------------------
  const key = (hotel.destinationKey || hotel.city).toLowerCase().replace(/[^a-z]/g, "");
  const pois = CITY_POIS[key] ?? null;

  const brief = [
    "==== HOTEL KNOWLEDGE BASE (your single source of truth) ====",
    identity,
    overview ? `\nOVERVIEW:\n${overview}` : "",
    amenities.length ? `\nAMENITIES & FACILITIES:\n${amenities.join(", ")}` : "\nAMENITIES & FACILITIES: not individually listed by the property — offer to confirm specifics with the hotel.",
    roomsBlock
      ? `\nROOM CATEGORIES (real, from live availability — features only; quote NO price, direct guests to the on-page Rooms section for live dated rates):\n${roomsBlock}`
      : "\nROOM CATEGORIES: pulled live in the on-page Rooms section once dates are set — invite the guest to add their dates there.",
    liveDining.length ? `\nON-SITE DINING:\n${liveDining.join(", ")}` : "",
    perks.length ? `\nADVISOR-EXCLUSIVE PERKS (complimentary on every WhataHotel booking):\n${perks.join("; ")}` : "",
    distances.length ? `\nDISTANCES / GETTING AROUND:\n${distances.join("; ")}` : "",
    tax ? `\nTAXES & FEES: ${tax}` : "",
    "\nPOLICIES (check-in/out, cancellation, deposits, children, pets, extra beds): confirm specifics directly with the hotel unless stated above — do not invent them.",
    pois ? `\n${areaBlock(pois, hotel.city)}` : `\nDESTINATION KNOWLEDGE: use reliable general knowledge of ${hotel.city}, ${hotel.country} for nearby attractions, dining, cafés and the nearest airport — frame specifics as things to confirm.`,
    "\n==== END KNOWLEDGE BASE ====",
  ]
    .filter(Boolean)
    .join("\n");

  const data: HotelDossier = { brief, rooms, hasArea: Boolean(pois), city: hotel.city };
  cache.set(cacheKey, { ts: Date.now(), data });
  return data;
}

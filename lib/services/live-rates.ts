import type { AdvisorPerk, Hotel } from "./types";
import type { HotelComparison, ComparisonRow } from "./recommendation-engine";

/**
 * Live rates service.
 *
 * Fetches a hotel's real, date-specific room rates from the official WhataHotel
 * data API (`/data/api.cfm?method=rates`). The API key is read from a server-only
 * env var and never reaches the browser — clients call our own `/api/rates`.
 * Results are cached in-memory (per hotel + date range) so repeat views and the
 * comparison grid don't re-hit the source.
 *
 * Runs server-side only.
 */

const API_BASE = process.env.WHATAHOTEL_API_URL || "https://whatahotel.com/data/api.cfm";
const API_KEY = process.env.WHATAHOTEL_API_KEY || "";
const CACHE_TTL = 30 * 60_000; // 30 min
const FETCH_TIMEOUT = 10_000;

export function liveRatesConfigured(): boolean {
  return Boolean(API_KEY);
}

export interface LiveRoom {
  name: string;
  description?: string;
  bedType?: string;
  nightly: number;
  total: number;
  currency: string;
  image?: string;
  /** Deep link to the WhataHotel booking form, prefilled with this exact room,
   *  rate, dates and guests. Present only for live dated fetches. */
  bookingURL?: string;
}

export interface LiveRates {
  live: boolean;
  hotelId: string; // source (numeric) id
  checkIn: string;
  checkOut: string;
  nights: number;
  currency: string;
  entryNightly: number; // cheapest available room, per night
  rooms: LiveRoom[];
  perks: AdvisorPerk[];
}

interface CacheEntry {
  ts: number;
  data: LiveRates;
}
const cache = new Map<string, CacheEntry>();

/** ColdFusion emits JSON with trailing commas — strip them before parsing. */
function parseWahJson<T = unknown>(text: string): T {
  return JSON.parse(text.replace(/,(\s*[\]}])/g, "$1")) as T;
}

function num(v: unknown): number {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const diff = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000,
  );
  return diff > 0 ? diff : 0;
}

interface WahRoom {
  roomName?: string;
  roomDesc?: string;
  bedType?: string;
  currency?: string;
  rateDaily?: string;
  rateTotal?: string;
  images?: { imgFile?: string; imgDesc?: string }[];
  bookingURL?: string;
}
interface WahRatesResponse {
  wahData?: {
    status?: { code?: string; message?: string };
    stay?: { nights?: string };
    rooms?: WahRoom[];
  };
}

async function fetchJson(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/**
 * Serialize upstream cityrates calls. The source throttles concurrent requests,
 * so firing one per city (as the homepage does) drops most of them. Chaining
 * them one-at-a-time keeps every city's rates coming back (results are cached).
 */
let cityChain: Promise<unknown> = Promise.resolve();
function cityQueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = cityChain.then(fn, fn);
  cityChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Fetch live rates for a source hotel id and date range via the WhataHotel API.
 * Returns null (→ caller falls back to an estimate) when unconfigured or the API
 * has no availability.
 */
export async function getLiveRates(params: {
  sourceHotelId: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
}): Promise<LiveRates | null> {
  const { sourceHotelId, checkIn, checkOut, guests = 2 } = params;
  const nights = nightsBetween(checkIn, checkOut);
  if (!API_KEY || !sourceHotelId || nights <= 0) return null;

  const key = `${sourceHotelId}|${checkIn}|${checkOut}|${guests}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  const url =
    `${API_BASE}?method=rates&hotel=${encodeURIComponent(sourceHotelId)}` +
    `&guests=${guests}&checkIn=${checkIn}&checkOut=${checkOut}` +
    `&apiKey=${encodeURIComponent(API_KEY)}`;

  try {
    const text = await fetchJson(url);
    const json = parseWahJson<WahRatesResponse>(text);
    const wah = json.wahData;
    if (!wah || wah.status?.code !== "200" || !Array.isArray(wah.rooms)) return null;

    // De-duplicate by room name, keeping the cheapest rate for each.
    const byName = new Map<string, LiveRoom>();
    for (const r of wah.rooms) {
      const name = (r.roomName || "").trim();
      const nightly = num(r.rateDaily);
      if (!name || !nightly) continue;
      const room: LiveRoom = {
        name,
        // Strip the source's "-WhataHotel! … Rate -" boilerplate prefix.
        description:
          r.roomDesc?.trim().replace(/^[-\s]*whatahotel!.*?\brate\b\s*-?\s*/i, "").trim() ||
          undefined,
        bedType: r.bedType?.trim() || undefined,
        nightly,
        total: num(r.rateTotal) || nightly * nights,
        currency: (r.currency || "USD").toUpperCase(),
        image: (r.images ?? []).map((i) => i.imgFile?.trim()).find(Boolean) || undefined,
        // Prefilled booking-form deep link (room + rate + dates + guests).
        bookingURL: r.bookingURL?.trim() || undefined,
      };
      const existing = byName.get(name);
      if (!existing || room.nightly < existing.nightly) byName.set(name, room);
    }

    const rooms = [...byName.values()].sort((a, b) => a.nightly - b.nightly);
    if (rooms.length === 0) return null;

    const data: LiveRates = {
      live: true,
      hotelId: sourceHotelId,
      checkIn,
      checkOut,
      nights: Number(wah.stay?.nights) || nights,
      currency: rooms[0].currency,
      entryNightly: rooms[0].nightly,
      rooms,
      perks: [], // perks come from the enriched dataset (hotel.perks)
    };
    cache.set(key, { ts: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}

function currencyFrom(s: unknown, fallback = "USD"): string {
  const m = String(s ?? "").match(/[A-Z]{3}/);
  return m ? m[0] : fallback;
}

/* ---------------------------------------------------------------- cityrates */

export interface CityRate {
  hotelId: string; // source numeric id
  nightly: number;
  total: number;
  currency: string;
}

interface WahCityHotel {
  hotelID?: string;
  rateDaily?: string;
  rateTotal?: string;
}
const cityCache = new Map<string, { ts: number; data: CityRate[] }>();

/** Dated starting rates for the hotels the API ranks in a city. */
export async function getCityRates(params: {
  city: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
}): Promise<CityRate[]> {
  const { city, checkIn, checkOut, guests = 2 } = params;
  if (!API_KEY || !city || nightsBetween(checkIn, checkOut) <= 0) return [];

  const nights = Math.max(1, nightsBetween(checkIn, checkOut));
  const key = `${city}|${checkIn}|${checkOut}|${guests}`;
  const hit = cityCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  const url =
    `${API_BASE}?method=cityrates&city=${encodeURIComponent(city)}` +
    `&guests=${guests}&checkIn=${checkIn}&checkOut=${checkOut}` +
    `&apiKey=${encodeURIComponent(API_KEY)}`;
  const fetchHotels = async (): Promise<WahCityHotel[] | null> => {
    const json = parseWahJson<{ wahData?: { status?: { code?: string }; hotels?: WahCityHotel[] } }>(
      await cityQueue(() => fetchJson(url)),
    );
    const wah = json.wahData;
    return wah && wah.status?.code === "200" && Array.isArray(wah.hotels) ? wah.hotels : null;
  };
  try {
    // One retry if the first attempt is throttled/empty.
    let hotels = await fetchHotels().catch(() => null);
    if (!hotels) {
      await new Promise((r) => setTimeout(r, 500));
      hotels = await fetchHotels().catch(() => null);
    }
    if (!hotels) return [];
    // rateDaily from cityrates is unreliable; rateTotal is trustworthy, so the
    // per-night figure is the all-in total ÷ nights.
    const data: CityRate[] = hotels
      .filter((h) => h.hotelID && num(h.rateTotal))
      .map((h) => {
        const total = num(h.rateTotal);
        return {
          hotelId: String(h.hotelID),
          nightly: Math.round(total / nights),
          total,
          currency: currencyFrom(h.rateTotal),
        };
      });
    cityCache.set(key, { ts: Date.now(), data });
    return data;
  } catch {
    return [];
  }
}

/* ------------------------------------------------------- live hotel search */

/**
 * A hotel returned by the live WhataHotel API — covers ANY city/hotel, not just
 * the local scraped set. `nightly` is present for dated city searches.
 */
export interface LiveHotel {
  sourceHotelId: string;
  name: string;
  city: string;
  country: string;
  image: string;
  bookingUrl: string;
  perks: string[];
  nightly?: number;
  currency?: string;
  rank?: number;
  /** Travel-intent enrichment, set by rankLiveHotels (lib/ai/travel-intent).
   *  Optional so the raw API mapping and other callers stay unaffected. */
  coordinates?: { lat: number; lng: number };
  relevanceScore?: number;
  /** Human "why it matches" note, e.g. "Family-friendly · with a pool". */
  matchReason?: string;
  /** Real distance to the requested anchor, e.g. "~1.2 km from South Beach". */
  distanceLabel?: string;
  /** Canonical amenity keys derived from method=info (set by attachLiveInfo). */
  amenities?: string[];
  /** On-site restaurant names from method=info (set by attachLiveInfo). */
  dining?: string[];
  /** Approximate all-in nightly (reliable rateTotal ÷ nights) — used ONLY for
   *  price ranking/budget filtering, NEVER displayed (the card fetches the true
   *  live rate). rateDaily is unreliable, but rateTotal is trustworthy. */
  approxNightly?: number;
}

interface WahListHotel {
  hotelID?: string;
  name?: string;
  city?: string;
  country?: string;
  images?: string;
  url?: string;
  "rates-url"?: string;
  "checkout-url"?: string;
  perks?: { perk?: string }[];
  rateDaily?: string;
  rateTotal?: string;
  rank?: string;
}

function toLiveHotel(h: WahListHotel): LiveHotel | null {
  if (!h.hotelID || !h.name) return null;
  return {
    sourceHotelId: String(h.hotelID),
    name: h.name.trim(),
    city: (h.city ?? "").trim(),
    country: (h.country ?? "").trim(),
    image: (h.images ?? "").trim(),
    bookingUrl: (h.url || h["rates-url"] || h["checkout-url"] || "").trim(),
    perks: (h.perks ?? []).map((p) => (p.perk ?? "").trim()).filter(Boolean).slice(0, 6),
    // The cityrates/search endpoints' `rateDaily` is unreliable (e.g. returns
    // $43 for a hotel whose real nightly is $122), so we NEVER expose it as a
    // price. True dated rates come from getLiveRates (method=rates) on the
    // stay/compare pages. We only keep rateTotal for ranking, below.
    nightly: undefined,
    currency: undefined,
    rank: h.rank ? Number(h.rank) : undefined,
  };
}

const cityHotelsCache = new Map<string, { ts: number; data: LiveHotel[] }>();

/** All hotels the API ranks in ANY city, with live dated rates. */
export async function getCityHotels(params: {
  city: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
}): Promise<LiveHotel[]> {
  const { city, checkIn, checkOut, guests = 2 } = params;
  if (!API_KEY || !city || nightsBetween(checkIn, checkOut) <= 0) return [];
  const key = `hotels|${city}|${checkIn}|${checkOut}|${guests}`;
  const hit = cityHotelsCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  const url =
    `${API_BASE}?method=cityrates&city=${encodeURIComponent(city)}` +
    `&guests=${guests}&checkIn=${checkIn}&checkOut=${checkOut}` +
    `&apiKey=${encodeURIComponent(API_KEY)}`;
  try {
    const json = parseWahJson<{ wahData?: { status?: { code?: string }; hotels?: WahListHotel[] } }>(
      await fetchJson(url),
    );
    const wah = json.wahData;
    if (wah && wah.status?.code === "200" && Array.isArray(wah.hotels) && wah.hotels.length) {
      // Rank by the reliable all-in rateTotal (rateDaily is broken — see toLiveHotel).
      const nights = nightsBetween(checkIn, checkOut);
      const data = wah.hotels
        .slice()
        .sort((a, b) => (num(a.rateTotal) || Infinity) - (num(b.rateTotal) || Infinity))
        .map((h) => {
          const lh = toLiveHotel(h);
          if (lh) {
            const rt = num(h.rateTotal);
            if (rt && nights > 0) lh.approxNightly = Math.round(rt / nights);
          }
          return lh;
        })
        .filter((h): h is LiveHotel => Boolean(h));
      cityHotelsCache.set(key, { ts: Date.now(), data });
      return data;
    }
    // cityrates couldn't match the city (e.g. Phuket → "Unable to match city").
    // Many directory cities aren't in the cityrates match list but ARE
    // searchable. Fall back to the directory search, filtered to that city. No
    // rateTotal here, so no approxNightly — the cards fetch each live rate.
    const data = await cityHotelsViaSearch(city);
    cityHotelsCache.set(key, { ts: Date.now(), data });
    return data;
  } catch {
    return [];
  }
}

/** Fallback for cities the cityrates endpoint can't match: search the directory
 *  by the city term and keep only hotels whose city matches. */
async function cityHotelsViaSearch(city: string): Promise<LiveHotel[]> {
  const results = await searchHotelsByName(city);
  const c = city.trim().toLowerCase();
  // Keep hotels whose city OR name matches the term — a region's hotels
  // sometimes carry a specific town as `city` (e.g. Park Hyatt Zanzibar).
  return results.filter((h) => {
    const hc = (h.city || "").toLowerCase();
    const nm = (h.name || "").toLowerCase();
    return nm.includes(c) || hc.includes(c) || (hc.length > 0 && c.includes(hc));
  });
}

const searchCache = new Map<string, { ts: number; data: LiveHotel[] }>();

/** Find hotels by name across the whole WhataHotel catalogue (no rates). */
export async function searchHotelsByName(query: string): Promise<LiveHotel[]> {
  if (!API_KEY || !query.trim()) return [];
  const key = `search|${query.trim().toLowerCase()}`;
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  const url =
    `${API_BASE}?method=search&hotelSearch=${encodeURIComponent(query.trim())}` +
    `&apiKey=${encodeURIComponent(API_KEY)}`;
  try {
    const json = parseWahJson<{ wahData?: { status?: { code?: string }; hotels?: WahListHotel[] } }>(
      await fetchJson(url),
    );
    const wah = json.wahData;
    if (!wah || wah.status?.code !== "200" || !Array.isArray(wah.hotels)) return [];
    const data = wah.hotels
      .map((h) => toLiveHotel(h))
      .filter((h): h is LiveHotel => Boolean(h));
    searchCache.set(key, { ts: Date.now(), data });
    return data;
  } catch {
    return [];
  }
}

/* ----------------------------------------------------- hotel lookup by id */

export interface LiveHotelFull {
  sourceHotelId: string;
  name: string;
  city: string;
  country: string;
  address?: string;
  image: string;
  gallery: string[];
  perks: string[];
  bookingUrl: string;
  coordinates?: { lat: number; lng: number };
}

interface WahHotelLookup extends WahListHotel {
  address?: string;
  "loc-lat"?: string;
  "loc-long"?: string;
}
const hotelCache = new Map<string, { ts: number; data: LiveHotelFull | null }>();

/**
 * Attach real coordinates to live city-search hotels (which don't carry lat/lng)
 * by looking each up via method=hotel. Bounded to the top `max` and run in
 * parallel; results are cached (hotelCache) so a repeat search is free. Hotels
 * whose lookup fails simply keep no coordinates (ranked without a distance).
 * Used for geographic intents (near the beach/airport/cruise port…).
 */
export async function attachLiveCoordinates(hotels: LiveHotel[], max = 12): Promise<LiveHotel[]> {
  const head = hotels.slice(0, max);
  const enriched = await Promise.all(
    head.map(async (h) => {
      if (h.coordinates) return h;
      const full = await getLiveHotel(h.sourceHotelId).catch(() => null);
      return full?.coordinates ? { ...h, coordinates: full.coordinates } : h;
    }),
  );
  return [...enriched, ...hotels.slice(max)];
}

/** Full identity for a single hotel by its WhataHotel id (method=hotel). */
export async function getLiveHotel(sourceHotelId: string): Promise<LiveHotelFull | null> {
  if (!API_KEY || !sourceHotelId) return null;
  const hit = hotelCache.get(sourceHotelId);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  const url = `${API_BASE}?method=hotel&hotel=${encodeURIComponent(sourceHotelId)}&apiKey=${encodeURIComponent(API_KEY)}`;
  try {
    const json = parseWahJson<{
      wahData?: {
        status?: { code?: string; connection?: number };
        hotels?: WahHotelLookup[];
        images?: { imgThumb?: string; imgFile?: string }[];
      };
    }>(await fetchJson(url));
    const wah = json.wahData;
    // This method reports success as code "100" (others use "200").
    const ok = wah && (wah.status?.connection === 1 || ["100", "200"].includes(String(wah.status?.code)));
    const h = wah?.hotels?.[0];
    if (!ok || !h || !h.hotelID || !h.name) {
      hotelCache.set(sourceHotelId, { ts: Date.now(), data: null });
      return null;
    }
    const lat = Number(h["loc-lat"]);
    const lng = Number(h["loc-long"]);
    const gallery = (wah.images ?? [])
      .map((i) => (i.imgThumb || i.imgFile || "").trim())
      .filter(Boolean);
    const data: LiveHotelFull = {
      sourceHotelId: String(h.hotelID),
      name: h.name.trim(),
      city: (h.city ?? "").trim(),
      country: (h.country ?? "").trim(),
      address: h.address?.trim() || undefined,
      image: (h.images ?? gallery[0] ?? "").trim(),
      gallery,
      perks: (h.perks ?? []).map((p) => (p.perk ?? "").trim()).filter(Boolean),
      bookingUrl: (h.url || h["checkout-url"] || "").trim(),
      coordinates: lat && lng ? { lat, lng } : undefined,
    };
    hotelCache.set(sourceHotelId, { ts: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------- info */

export interface HotelInfo {
  description?: string;
  amenities: string[];
  restaurants: string[];
  tax?: string;
  /** Nearby attractions (ATTRACTIONINFO). */
  attractions: string[];
  /** Room/suite types with size + in-room features (GUESTROOMS). */
  roomTypes: { desc: string; features: string[] }[];
  /** Good-to-know policies (POLICYINFO), boilerplate filtered out. */
  policies: string[];
}

interface WahInfoSection { HOTELTITLE?: string; HOTELDESC?: string }
interface WahGuestRoom { ROOMDESC?: string; ROOMTYPE?: string; ROOMRMA?: { RMAVAL?: string }[] }
interface WahAttraction { ATTNAME?: string; ATTTYPE?: string }
interface WahPolicy { POLICYDESC?: string }
const infoCache = new Map<string, { ts: number; data: HotelInfo | null }>();

const AMENITY_SECTIONS = /amenit|facilit|service|recreational/i;

/** Real descriptive info: amenities, dining, description, tax policy. */
export async function getHotelInfo(hotelName: string, city: string): Promise<HotelInfo | null> {
  if (!API_KEY || !hotelName) return null;
  const key = `${hotelName}|${city}`;
  const hit = infoCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  const url =
    `${API_BASE}?method=info&hotelName=${encodeURIComponent(hotelName)}` +
    `&hotelCity=${encodeURIComponent(city)}&apiKey=${encodeURIComponent(API_KEY)}`;
  try {
    const json = parseWahJson<{
      wahData?: {
        status?: { code?: string };
        hotel?: {
          HOTELINFO?: WahInfoSection[];
          RESTAURANTS?: { RESTAURANTNAME?: string }[];
          GUESTROOMS?: WahGuestRoom[];
          ATTRACTIONINFO?: WahAttraction[];
          POLICYINFO?: WahPolicy[];
        };
      };
    }>(await fetchJson(url));
    const hotel = json.wahData?.hotel;
    if (json.wahData?.status?.code !== "200" || !hotel) {
      infoCache.set(key, { ts: Date.now(), data: null });
      return null;
    }
    const sections = hotel.HOTELINFO ?? [];
    const description = sections.find((s) => /location/i.test(s.HOTELTITLE || ""))?.HOTELDESC?.trim();
    const tax = sections.find((s) => /tax/i.test(s.HOTELTITLE || ""))?.HOTELDESC?.trim();
    const amenities = [
      ...new Set(
        sections
          .filter((s) => AMENITY_SECTIONS.test(s.HOTELTITLE || ""))
          .flatMap((s) => (s.HOTELDESC || "").split(/\r?\n/))
          .map((line) => line.replace(/^[-•\s]+/, "").trim())
          .filter((l) => l.length > 1 && l.length < 60 && !/please contact|information$/i.test(l)),
      ),
    ];
    const restaurants = (hotel.RESTAURANTS ?? [])
      .map((r) => r.RESTAURANTNAME?.trim() || "")
      .filter(Boolean);
    const attractions = [
      ...new Set(
        (hotel.ATTRACTIONINFO ?? [])
          .map((a) => (a.ATTNAME || "").trim())
          .filter((n) => n.length > 1),
      ),
    ];
    const roomTypes = (hotel.GUESTROOMS ?? [])
      .map((r) => ({
        desc: (r.ROOMDESC || "").trim(),
        features: [...new Set((r.ROOMRMA ?? []).map((x) => (x.RMAVAL || "").trim()).filter(Boolean))],
      }))
      .filter((r) => r.desc);
    const policies = [
      ...new Set(
        (hotel.POLICYINFO ?? [])
          .map((p) => (p.POLICYDESC || "").replace(/\s+/g, " ").trim())
          // Drop pure boilerplate ("contact property for directions/policy…").
          .filter((d) => d.length > 15 && !/contact (?:the )?(?:property|hotel) (?:directly )?for (?:directions|family)/i.test(d)),
      ),
    ];
    const data: HotelInfo = { description, amenities, restaurants, tax, attractions, roomTypes, policies };
    infoCache.set(key, { ts: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}

// Keyword → canonical amenity key (must match the keys travel-intent knows).
// method=info's structured amenities are spotty, so we scan the description +
// amenities + restaurant text together — best-effort, never fabricated.
const AMENITY_SIGNALS: [RegExp, string][] = [
  [/\bspa\b|wellness (?:cent|spa)|massage|hammam|thermal/i, "spa"],
  [/\bpool\b|swimming/i, "pool"],
  [/beach\s?front|on the beach|private beach|beach access|steps? (?:to|from) the beach/i, "beachfront"],
  [/ocean\s?view|sea\s?view|water\s?view/i, "oceanview"],
  [/\bgym\b|fitness|health club|workout/i, "gym"],
  [/kids?[ '-]?club|children'?s club|kids? (?:program|activities)|babysitt|family (?:program|friendly)/i, "kidsclub"],
  [/airport (?:transfer|shuttle|limousine)|complimentary shuttle/i, "airporttransfer"],
  [/butler/i, "butler"],
  [/roof\s?top|sky ?bar|sky ?lounge/i, "rooftop"],
  [/casino/i, "casino"],
  [/ski[ -](?:in|lift|slope|resort|valet)/i, "ski"],
  [/connecting rooms?|adjoining rooms?/i, "connecting"],
  [/complimentary breakfast|breakfast included/i, "breakfast"],
  [/fireplace/i, "fireplace"],
  [/michelin/i, "michelin"],
];

function deriveAmenities(info: HotelInfo): string[] {
  const blob = [info.description ?? "", ...(info.amenities ?? []), ...(info.restaurants ?? [])].join(" ");
  const out = new Set<string>();
  for (const [re, key] of AMENITY_SIGNALS) if (re.test(blob)) out.add(key);
  return [...out];
}

/**
 * Enrich the SHOWN live hotels with real amenities + on-site dining (method=info)
 * so each card can carry a grounded "why it matches" note. Bounded to `max`,
 * parallel, cached (infoCache) and graceful — a failed lookup just leaves the
 * hotel without extra facts. Never invents anything.
 */
export async function attachLiveInfo(hotels: LiveHotel[], max = 9): Promise<LiveHotel[]> {
  const head = hotels.slice(0, max);
  const enriched = await Promise.all(
    head.map(async (h) => {
      if (h.amenities) return h;
      const info = await getHotelInfo(h.name, h.city).catch(() => null);
      if (!info) return h;
      // Prefer a real restaurant to name-drop over a coffee bar / lounge / in-room.
      const proper = info.restaurants.filter(
        (r) => !/coffee|\btea\b|in-?room|lounge|\bbar\b|caf[eé]|deli|market|poolside|grab|espresso|room service/i.test(r),
      );
      const dining = (proper.length ? proper : info.restaurants).slice(0, 3);
      return { ...h, amenities: deriveAmenities(info), dining };
    }),
  );
  return [...enriched, ...hotels.slice(max)];
}

/* --------------------------------------------------- live comparison builder */

function money(n: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "USD").toUpperCase(),
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString()}`;
  }
}

/**
 * Build a side-by-side comparison enriched with LIVE data from the WhataHotel
 * API — dated rates, room categories, advisor-exclusive perks, amenities and
 * dining — so the chat compares on real facts, not stored placeholders.
 *
 * Fetches are sequential (the source API throttles concurrent requests) and
 * cached, so a repeat comparison is instant. Live rates need dates; perks,
 * amenities and dining are shown either way.
 */
export async function buildLiveComparison(
  hotels: Hotel[],
  checkIn?: string,
  checkOut?: string,
  priority?: string,
): Promise<HotelComparison> {
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  const cols: {
    h: Hotel;
    rates: LiveRates | null;
    info: HotelInfo | null;
  }[] = [];
  for (const h of hotels) {
    const rates =
      h.sourceHotelId && nights > 0
        ? await getLiveRates({ sourceHotelId: h.sourceHotelId, checkIn: checkIn!, checkOut: checkOut! })
        : null;
    const info = await getHotelInfo(h.name, h.city);
    cols.push({ h, rates, info });
  }

  const perksOf = (h: Hotel) => (h.perks ?? []).map((p) => p.label).filter(Boolean);
  // The source room name often trails the full description ("Deluxe Suite, 1 King, 65sqm…").
  const roomLabel = (name: string) => name.split(",")[0].trim();
  // method=info amenities are raw — drop ALL-CAPS section headers, prices and boilerplate.
  const cleanAmenities = (a?: string[]) =>
    (a ?? [])
      .map((s) => s.trim())
      .filter((s) => s.length >= 3 && s.length <= 36)
      .filter((s) => !/^this hotel/i.test(s))
      .filter((s) => !/\d+\.\d{2}/.test(s))
      .filter((s) => /[a-z]/.test(s)); // keep only entries with lowercase (real names, not headers)
  const readable = (k: string) =>
    k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
  // Prefer the curated canonical amenities; fall back to cleaned API amenities.
  const amenitiesOf = (c: { h: Hotel; info: HotelInfo | null }) =>
    c.h.amenities?.length
      ? c.h.amenities.slice(0, 6).map(readable)
      : cleanAmenities(c.info?.amenities).slice(0, 5);

  // Estimate the cash value of a hotel's advisor perks (explicit "$X" credits are
  // real; common perks get a conservative nominal value) to rank best value.
  const perkCashValue = (perks: string[]): number => {
    let total = 0;
    for (const p of perks) {
      const m = p.match(/\$\s?(\d{2,5})/);
      if (m) { total += Number(m[1]); continue; }
      if (/breakfast/i.test(p)) total += 55 * Math.max(1, nights);
      else if (/upgrade/i.test(p)) total += 120;
      else if (/transfer|airport|train station/i.test(p)) total += 90;
      else if (/late (check|check-?out)/i.test(p)) total += 40;
      else if (/wi-?fi|internet/i.test(p)) total += 0;
      else total += 25;
    }
    return total;
  };
  const nightsV = Math.max(1, nights);
  const priced = cols.map((c) => (c.rates ? c.rates.entryNightly : Infinity));
  const anyPriced = priced.some((p) => p !== Infinity);
  // Value = live nightly minus the per-night value of the included perks; lowest
  // effective rate wins. No live rates yet? fall back to the most perks.
  const effective = cols.map((c) =>
    c.rates ? c.rates.entryNightly - perkCashValue(perksOf(c.h)) / nightsV : Infinity,
  );
  const bestValueIdx = anyPriced
    ? effective.indexOf(Math.min(...effective))
    : cols.map((c) => perksOf(c.h).length).reduce((b, n, i, a) => (n > a[b] ? i : b), 0);

  const rows: ComparisonRow[] = [
    {
      label: nights > 0 ? `Live rate · ${nights} night${nights > 1 ? "s" : ""}` : "Live rate",
      values: cols.map((c) =>
        c.rates
          ? `${money(c.rates.entryNightly, c.rates.currency)}/night`
          : nights > 0
            ? "Rate on request"
            : "Add dates for live rates",
      ),
    },
    {
      label: "Value",
      values: cols.map((c, i) =>
        i === bestValueIdx ? "★ Best value" : c.rates || perksOf(c.h).length ? "—" : "Add dates",
      ),
    },
    {
      label: "Room categories",
      values: cols.map((c) =>
        c.rates?.rooms.length
          ? [...new Set(c.rates.rooms.map((r) => roomLabel(r.name)))].slice(0, 3).join(", ")
          : "Shown at booking",
      ),
    },
    {
      label: "Exclusive perks",
      values: cols.map((c) => {
        const p = perksOf(c.h);
        return p.length ? p.slice(0, 4).join(" · ") : "—";
      }),
    },
    {
      label: "Amenities",
      values: cols.map((c) => {
        const a = amenitiesOf(c);
        return a.length ? a.join(", ") : "—";
      }),
    },
    {
      label: "Dining",
      values: cols.map((c) => (c.info?.restaurants?.length ? c.info.restaurants.slice(0, 3).join(", ") : "—")),
    },
    {
      label: "Class",
      values: cols.map((c) => (c.h.starRating ? "★".repeat(c.h.starRating) : "—")),
    },
    {
      label: "Guest rating",
      values: cols.map((c) => (c.h.rating > 0 ? `${c.h.rating}/10` : "—")),
    },
    {
      label: "Location",
      values: cols.map((c) =>
        [c.h.neighborhood && c.h.neighborhood !== c.h.city ? c.h.neighborhood : "", `${c.h.city}, ${c.h.country}`]
          .filter(Boolean)
          .join(" · "),
      ),
    },
  ];

  const best = cols[bestValueIdx].h.name;
  const forPriority = priority ? ` for ${priority}` : "";
  const recommendation = anyPriced
    ? `Best value${forPriority}: ${best} — perks factored against the live rate.${priority ? "" : " Tell me what matters most (location, dining, spa) and I'll re-weigh it."}`
    : `${best} leads on inclusions${forPriority}. Share your dates and I'll pull live rates to compare on price too.`;

  return {
    hotels: hotels.map((h) => ({ id: h.id, name: h.name, image: h.image, city: h.city })),
    rows,
    recommendation,
  };
}

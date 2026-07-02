import type { AdvisorPerk } from "./types";

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
        description: r.roomDesc?.trim() || undefined,
        bedType: r.bedType?.trim() || undefined,
        nightly,
        total: num(r.rateTotal) || nightly * nights,
        currency: (r.currency || "USD").toUpperCase(),
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

  const key = `${city}|${checkIn}|${checkOut}|${guests}`;
  const hit = cityCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  const url =
    `${API_BASE}?method=cityrates&city=${encodeURIComponent(city)}` +
    `&guests=${guests}&checkIn=${checkIn}&checkOut=${checkOut}` +
    `&apiKey=${encodeURIComponent(API_KEY)}`;
  try {
    const json = parseWahJson<{ wahData?: { status?: { code?: string }; hotels?: WahCityHotel[] } }>(
      await fetchJson(url),
    );
    const wah = json.wahData;
    if (!wah || wah.status?.code !== "200" || !Array.isArray(wah.hotels)) return [];
    const data: CityRate[] = wah.hotels
      .filter((h) => h.hotelID && num(h.rateDaily))
      .map((h) => ({
        hotelId: String(h.hotelID),
        nightly: num(h.rateDaily),
        total: num(h.rateTotal),
        currency: currencyFrom(h.rateDaily),
      }));
    cityCache.set(key, { ts: Date.now(), data });
    return data;
  } catch {
    return [];
  }
}

/* --------------------------------------------------------------------- info */

export interface HotelInfo {
  description?: string;
  amenities: string[];
  restaurants: string[];
  tax?: string;
}

interface WahInfoSection { HOTELTITLE?: string; HOTELDESC?: string }
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
        hotel?: { HOTELINFO?: WahInfoSection[]; RESTAURANTS?: { RESTAURANTNAME?: string }[] };
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
          .filter((l) => l.length > 1 && l.length < 60),
      ),
    ];
    const restaurants = (hotel.RESTAURANTS ?? [])
      .map((r) => r.RESTAURANTNAME?.trim() || "")
      .filter(Boolean);
    const data: HotelInfo = { description, amenities, restaurants, tax };
    infoCache.set(key, { ts: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}

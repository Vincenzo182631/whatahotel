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

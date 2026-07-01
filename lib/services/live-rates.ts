import type { AdvisorPerk } from "./types";

/**
 * Live rates service.
 *
 * Fetches a hotel's real room rates and advisor perks straight from the
 * WhataHotel booking page (`/booking/showRates.cfm`) for the requested dates,
 * and parses the room list + "Exclusive Complimentary Perks" out of the HTML.
 * Results are cached in-memory (per hotel + date range) so repeat views and the
 * comparison grid don't re-hit the source.
 *
 * This runs server-side only. The browser calls our own `/api/rates` route.
 */

const BASE = "https://whatahotel.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const CACHE_TTL = 30 * 60_000; // 30 min
const FETCH_TIMEOUT = 9_000;

export interface LiveRoom {
  name: string;
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

function decode(s: string): string {
  return (s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&eacute;/g, "é")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const diff = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000,
  );
  return diff > 0 ? diff : 0;
}

/** Pull the advisor perks out of the `perksList` block. */
function parsePerks(html: string): AdvisorPerk[] {
  const block = html.match(/perksList([\s\S]*?)<\/ul>/i);
  if (!block) return [];
  const items = [...block[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => decode(m[1]))
    .filter(Boolean);
  return items.map((label, i) => ({
    id: `perk-${i + 1}`,
    label: label.replace(/\*+$/g, "").trim(),
    detail: "Complimentary with your WhataHotel booking",
  }));
}

/**
 * Pull the room list. On the page, each room renders as a run of headings:
 * ["Exclusive Complimentary Perks", "<Room Name>", "Starting at: <N> <CUR> per Room"].
 * We anchor on the "Starting at" heading and take the preceding heading as the
 * room name.
 */
function parseRooms(html: string, nights: number): LiveRoom[] {
  const heads = [...html.matchAll(/<h[234][^>]*>([\s\S]*?)<\/h[234]>/gi)].map((m) =>
    decode(m[1]),
  );
  const rooms: LiveRoom[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < heads.length; i++) {
    const m = heads[i].match(/Starting at:\s*([\d.,]+)\s*([A-Z]{3})/i);
    if (!m) continue;
    const prev = heads[i - 1] || "";
    const name = /Starting at/i.test(prev) ? "" : prev;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const nightly = Math.round(parseFloat(m[1].replace(/,/g, "")));
    if (!nightly) continue;
    rooms.push({
      name,
      nightly,
      total: nightly * Math.max(1, nights),
      currency: m[2].toUpperCase(),
    });
  }
  return rooms;
}

async function fetchHtml(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch + parse live rates for a source hotel id and date range. Returns null if
 * the page can't be fetched/parsed so callers can fall back to an estimate.
 */
export async function getLiveRates(params: {
  sourceHotelId: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
}): Promise<LiveRates | null> {
  const { sourceHotelId, checkIn, checkOut, guests = 2 } = params;
  const nights = nightsBetween(checkIn, checkOut);
  if (!sourceHotelId || nights <= 0) return null;

  const key = `${sourceHotelId}|${checkIn}|${checkOut}|${guests}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  const url = `${BASE}/booking/showRates.cfm?hotelID=${encodeURIComponent(
    sourceHotelId,
  )}&guests=${guests}&checkIn=${checkIn}&checkOut=${checkOut}`;

  try {
    const html = await fetchHtml(url);
    const rooms = parseRooms(html, nights).sort((a, b) => a.nightly - b.nightly);
    const perks = parsePerks(html);
    if (rooms.length === 0) return null;

    const data: LiveRates = {
      live: true,
      hotelId: sourceHotelId,
      checkIn,
      checkOut,
      nights,
      currency: rooms[0].currency,
      entryNightly: rooms[0].nightly,
      rooms,
      perks,
    };
    cache.set(key, { ts: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}

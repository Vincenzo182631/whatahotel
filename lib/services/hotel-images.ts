import { getLiveRates } from "./live-rates";
import type { Hotel } from "./types";

/**
 * Hotel image manifest.
 *
 * The set of REAL photos the chatbot may show for a hotel, each with a stable id
 * the model references (e.g. `[img:r1]`) so it can never invent a URL:
 *   • room photos  — from the live rates API, captioned with the real room name
 *   • hotel photos — the property's own gallery (general shots; unlabelled, so we
 *                    never claim a specific one is "the pool/lobby")
 *
 * We deliberately have NO photos for nearby restaurants/attractions, so those are
 * never given an image. Deterministic ids so the server prompt and the client
 * renderer resolve to the same picture. Cached per hotel.
 */

export interface HotelImage {
  id: string;
  url: string;
  label: string;
  kind: "room" | "hotel";
}

const CACHE_TTL = 30 * 60_000;
const cache = new Map<string, { ts: number; data: HotelImage[] }>();

const pad = (n: number) => String(n).padStart(2, "0");
function futureDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Probe near-future availability to recover the room catalogue's photos. */
async function probeRoomImages(sourceHotelId: string) {
  for (const offset of [30, 90]) {
    const r = await getLiveRates({
      sourceHotelId,
      checkIn: futureDate(offset),
      checkOut: futureDate(offset + 3),
    });
    if (r && r.rooms.length) return r.rooms;
  }
  return [];
}

/** Build (or return cached) the real image manifest for a hotel. */
export async function buildHotelImageManifest(hotel: Hotel): Promise<HotelImage[]> {
  const key = hotel.sourceHotelId || hotel.id;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  const rooms = hotel.sourceHotelId ? await probeRoomImages(hotel.sourceHotelId).catch(() => []) : [];

  const images: HotelImage[] = [];
  const seen = new Set<string>();

  // Room photos — labelled with the real room name.
  let ri = 1;
  for (const r of rooms) {
    if (r.image && !seen.has(r.image)) {
      seen.add(r.image);
      images.push({ id: `r${ri++}`, url: r.image, label: r.name, kind: "room" });
    }
  }

  // Hotel gallery — general property photos (up to 8).
  let hi = 1;
  for (const url of [hotel.image, ...(hotel.gallery ?? [])]) {
    if (url && !seen.has(url)) {
      seen.add(url);
      images.push({ id: `h${hi}`, url, label: `${hotel.name} — property photo ${hi}`, kind: "hotel" });
      hi++;
      if (hi > 8) break;
    }
  }

  cache.set(key, { ts: Date.now(), data: images });
  return images;
}

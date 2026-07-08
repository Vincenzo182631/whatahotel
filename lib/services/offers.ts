import { randomBytes } from "node:crypto";
import { redisConfigured, redisCommand } from "@/lib/data/redis-store";

/**
 * Agent-curated offers. An agent picks 2–3 hotels + dates and a personal note;
 * the guest opens a stable short link (/offer/<id>) that shows the comparison
 * with LIVE rates (re-fetched each visit) and the AI advisor. Backed by Redis
 * (Vercel KV) with a process-global in-memory fallback — mirrors the CRM stores.
 */

export type OfferStatus = "draft" | "sent" | "viewed";

export interface Offer {
  id: string;
  agentEmail: string;
  agentName?: string;
  guestName?: string;
  guestEmail?: string;
  city: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  note?: string;
  hotelIds: string[]; // 2–3 sourceHotelIds / local slugs
  status: OfferStatus;
  createdAt: number;
  updatedAt: number;
  sentAt?: number;
  firstViewedAt?: number;
  viewCount: number;
}

const KEY = (id: string) => `offer:${id}`;
const INDEX = "offer:index";
const TTL = 60 * 60 * 24 * 365; // offers don't expire (rates are re-fetched live)
const useRedis = redisConfigured();
const globalForOffers = globalThis as unknown as { __wahOffers?: Map<string, Offer> };
const mem = globalForOffers.__wahOffers ?? (globalForOffers.__wahOffers = new Map<string, Offer>());

/** Short, URL-safe, unguessable id (base36 of 6 random bytes → ~9 chars). */
function shortId(): string {
  return BigInt("0x" + randomBytes(6).toString("hex")).toString(36);
}

async function load(id: string): Promise<Offer | null> {
  if (useRedis) {
    try {
      const raw = await redisCommand<string | null>(["GET", KEY(id)]);
      if (raw) return JSON.parse(raw) as Offer;
    } catch {
      /* fall back to memory */
    }
  }
  return mem.get(id) ?? null;
}

async function save(offer: Offer): Promise<Offer> {
  offer.updatedAt = Date.now();
  mem.set(offer.id, offer);
  if (useRedis) {
    try {
      await redisCommand(["SET", KEY(offer.id), JSON.stringify(offer), "EX", TTL]);
      await redisCommand(["ZADD", INDEX, offer.updatedAt, offer.id]);
    } catch {
      /* keep the in-memory copy */
    }
  }
  return offer;
}

export async function createOffer(
  input: Omit<Offer, "id" | "status" | "createdAt" | "updatedAt" | "viewCount">,
): Promise<Offer> {
  const now = Date.now();
  const offer: Offer = {
    ...input,
    id: shortId(),
    status: "draft",
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  return save(offer);
}

export async function getOffer(id: string): Promise<Offer | null> {
  return load(id);
}

/** Record a guest view (first view flips status → "viewed"). */
export async function markOfferViewed(id: string): Promise<Offer | null> {
  const offer = await load(id);
  if (!offer) return null;
  offer.viewCount += 1;
  if (!offer.firstViewedAt) offer.firstViewedAt = Date.now();
  if (offer.status !== "viewed") offer.status = "viewed";
  return save(offer);
}

/** Mark the offer emailed to the guest. */
export async function markOfferSent(id: string): Promise<Offer | null> {
  const offer = await load(id);
  if (!offer) return null;
  offer.sentAt = Date.now();
  if (offer.status === "draft") offer.status = "sent";
  return save(offer);
}

export async function listOffers(limit = 100): Promise<Offer[]> {
  if (useRedis) {
    try {
      const ids = (await redisCommand<string[]>(["ZREVRANGE", INDEX, 0, limit - 1])) ?? [];
      const out: Offer[] = [];
      for (const id of ids) {
        const o = await load(id);
        if (o) out.push(o);
      }
      return out;
    } catch {
      /* fall back to memory */
    }
  }
  return [...mem.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
}

import type { BookingDraft } from "@/lib/chat/types";
import type { Recommendation, SearchCriteria } from "./types";
import { redisConfigured, redisCommand } from "@/lib/data/redis-store";

/**
 * User Session Storage service.
 *
 * Server-side memory of each conversation: the live criteria and the most
 * recently surfaced recommendations (so "compare the first and third" and
 * "book the second" resolve without re-sending state).
 *
 * Backed by Redis (Vercel KV / Upstash) when configured, so conversation state
 * survives across serverless instances — otherwise an in-memory Map (dev / a
 * single warm instance). A per-instance cache keeps reads fast either way.
 */

export interface SessionState {
  id: string;
  criteria: SearchCriteria;
  lastRecommendations: Recommendation[];
  booking?: BookingDraft;
  updatedAt: number;
}

// Per-instance cache (also the whole store when Redis isn't configured).
const globalForSessions = globalThis as unknown as {
  __whataHotelSessions?: Map<string, SessionState>;
};
const sessions =
  globalForSessions.__whataHotelSessions ??
  (globalForSessions.__whataHotelSessions = new Map<string, SessionState>());

const KEY = (id: string) => `session:${id}`;
const TTL_SECONDS = 60 * 60 * 6; // 6h — long enough for a planning session
const useRedis = redisConfigured();

function fresh(id: string): SessionState {
  return { id, criteria: {}, lastRecommendations: [], updatedAt: Date.now() };
}

export const sessionStorageService = {
  async get(id: string): Promise<SessionState> {
    if (useRedis) {
      try {
        const raw = await redisCommand<string | null>(["GET", KEY(id)]);
        if (raw) {
          const state = JSON.parse(raw) as SessionState;
          sessions.set(id, state);
          return state;
        }
      } catch {
        // fall back to the in-memory copy on any Redis hiccup
        const cached = sessions.get(id);
        if (cached) return cached;
      }
    }
    let s = sessions.get(id);
    if (!s) {
      s = fresh(id);
      sessions.set(id, s);
    }
    return s;
  },

  async save(
    id: string,
    patch: Partial<Omit<SessionState, "id">>,
  ): Promise<SessionState> {
    const current = await this.get(id);
    const next: SessionState = { ...current, ...patch, id, updatedAt: Date.now() };
    sessions.set(id, next);
    if (useRedis) {
      try {
        await redisCommand(["SET", KEY(id), JSON.stringify(next), "EX", TTL_SECONDS]);
      } catch {
        /* keep the in-memory copy for this instance */
      }
    }
    return next;
  },

  async reset(id: string): Promise<void> {
    sessions.delete(id);
    if (useRedis) {
      try {
        await redisCommand(["DEL", KEY(id)]);
      } catch {
        /* ignore */
      }
    }
  },
};
